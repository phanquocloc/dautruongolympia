const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const os = require('os');
const fs = require('fs');
const QRCode = require('qrcode');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const QUESTIONS_FILE = path.join(__dirname, 'data', 'questions.json');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper to get local network IP
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

const localIP = getLocalIP();
const publicBaseUrl = process.env.RENDER_EXTERNAL_URL || process.env.PUBLIC_URL || `http://${localIP}:${PORT}`;
const defaultPlayerUrl = `${publicBaseUrl.replace(/\/$/, '')}/player`;
let playerQrDataUrl = '';
QRCode.toDataURL(defaultPlayerUrl, { margin: 1, width: 280, color: { dark: '#120722', light: '#FFD700' } }, (err, url) => {
  if (!err) playerQrDataUrl = url;
});

// Load questions bank
function loadQuestions() {
  try {
    const raw = fs.readFileSync(QUESTIONS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading questions.json:', e);
    return { round1: [], round2: { keyword: '', keywordHints: [], pieces: [] }, round3: { question: {} } };
  }
}

function saveQuestions(data) {
  try {
    fs.writeFileSync(QUESTIONS_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Error saving questions.json:', e);
    return false;
  }
}

// Initial default teams with 60s Psychedelic Palette (DESIGN.MD)
function createDefaultTeams() {
  return [
    {
      id: 'team-1',
      name: 'Đội 1 – Hỏa Phượng',
      shortName: 'Hỏa Phượng',
      mascot: 'Phượng Hoàng Lửa',
      color: '#FF5F00', // Electric Orange
      bgGlow: 'rgba(255, 95, 0, 0.25)',
      avatar: 'fire_phoenix',
      score: 0,
      r1Score: 0,
      r2Score: 0,
      r3Wager: 0,
      r3Result: 0,
      connected: false,
      socketId: null,
      locked: false,
      keywordLocked: false,
      answerCount: 0
    },
    {
      id: 'team-2',
      name: 'Đội 2 – Thanh Long',
      shortName: 'Thanh Long',
      mascot: 'Rồng Xanh Ngọc',
      color: '#C2F700', // Lime Green
      bgGlow: 'rgba(194, 247, 0, 0.25)',
      avatar: 'azure_dragon',
      score: 0,
      r1Score: 0,
      r2Score: 0,
      r3Wager: 0,
      r3Result: 0,
      connected: false,
      socketId: null,
      locked: false,
      keywordLocked: false,
      answerCount: 0
    },
    {
      id: 'team-3',
      name: 'Đội 3 – Bạch Hổ',
      shortName: 'Bạch Hổ',
      mascot: 'Hổ Trắng Oai Phong',
      color: '#FFD700', // Sunshine Yellow
      bgGlow: 'rgba(255, 215, 0, 0.25)',
      avatar: 'white_tiger',
      score: 0,
      r1Score: 0,
      r2Score: 0,
      r3Wager: 0,
      r3Result: 0,
      connected: false,
      socketId: null,
      locked: false,
      keywordLocked: false,
      answerCount: 0
    },
    {
      id: 'team-4',
      name: 'Đội 4 – Huyền Vũ',
      shortName: 'Huyền Vũ',
      mascot: 'Rùa Rắn Linh Thiêng',
      color: '#A020F0', // Purple Haze
      bgGlow: 'rgba(160, 32, 240, 0.25)',
      avatar: 'black_tortoise',
      score: 0,
      r1Score: 0,
      r2Score: 0,
      r3Wager: 0,
      r3Result: 0,
      connected: false,
      socketId: null,
      locked: false,
      keywordLocked: false,
      answerCount: 0
    },
    {
      id: 'team-5',
      name: 'Đội 5 – Kim Lân',
      shortName: 'Kim Lân',
      mascot: 'Kỳ Lân Hoàng Kim',
      color: '#FF1D8E', // Hot Pink
      bgGlow: 'rgba(255, 29, 142, 0.25)',
      avatar: 'golden_qilin',
      score: 0,
      r1Score: 0,
      r2Score: 0,
      r3Wager: 0,
      r3Result: 0,
      connected: false,
      socketId: null,
      locked: false,
      keywordLocked: false,
      answerCount: 0
    }
  ];
}

// Master authoritative state
class GameRoom {
  constructor(roomCode = 'ARENA88') {
    this.roomCode = roomCode;
    this.status = 'LOBBY'; // LOBBY, ROUND1, ROUND1_RECAP, ROUND2, ROUND2_RECAP, ROUND3_BET, ROUND3_TRANSITION, ROUND3_QUESTION, ROUND3_RECAP, FINALE_SUSPENSE, FINALE_PODIUM, FINALE_LEADERBOARD
    this.paused = false;
    this.questions = loadQuestions();
    this.teams = createDefaultTeams();
    this.eventLog = [];
    
    // Round 1 State
    this.r1QuestionIndex = 0;
    this.r1Stage = 'IDLE'; // IDLE, QUESTION_OPEN, BUZZER_OPEN, ANSWERING, REVEALED
    this.r1BuzzerQueue = []; // [{ teamId, timestamp }]
    this.r1ActiveAttempt = 0; // 0: 30pts, 1: 20pts, 2: 10pts
    this.r1CurrentTurn = null; // teamId currently answering
    this.r1SelectedAnswer = null; // index of chosen answer
    this.r1TurnTimer = null;
    this.r1TurnTimeLeft = 5;

    // Round 2 State
    this.r2CurrentPieceIndex = -1; // 0 to 5, or -1 if none
    this.r2Stage = 'IDLE'; // IDLE, PIECE_QUESTION, PIECE_BUZZER, PIECE_ANSWERING, PIECE_REVEALED, KEYWORD_GUESSING
    this.r2PiecesUnlocked = [false, false, false, false, false, false];
    this.r2KeywordSolved = false;
    this.r2KeywordWinner = null;
    this.r2BuzzerQueue = [];
    this.r2ActiveAttempt = 0; // 0: 20pts, 1: 10pts
    this.r2CurrentTurn = null;
    this.r2KeywordTurn = null; // team currently guessing keyword

    // Round 3 State
    this.r3Stage = 'IDLE'; // IDLE, BETTING, TRANSITION, REVEAL_BETS, QUESTION, ANSWERING, REVEALED
    this.r3BetTimeLeft = 10;
    this.r3BetTimer = null;
    this.r3Bets = {}; // { 'team-1': 50, ... }
    this.r3BuzzerQueue = [];
    this.r3CurrentTurn = null;
    this.r3SelectedAnswer = null;

    // Finale
    this.finaleStep = 0; // 0: none, 1: suspense, 2: rank 5, 3: rank 4, 4: rank 3, 5: rank 2, 6: champion, 7: full leaderboard
    
    // Server Timer State
    this.activeTimer = null;
    this.timerEndsAt = 0;
    this.timerDuration = 0;
  }

  logEvent(type, message, details = {}) {
    const entry = {
      id: Date.now() + '-' + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString('vi-VN'),
      timestamp: Date.now(),
      type,
      message,
      details
    };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 100) this.eventLog.pop();
    return entry;
  }

  getTeam(teamId) {
    return this.teams.find(t => t.id === teamId);
  }

  resetRoom(keepQuestions = true) {
    if (!keepQuestions) {
      this.questions = loadQuestions();
    }
    this.status = 'LOBBY';
    this.paused = false;
    this.teams = createDefaultTeams();
    this.eventLog = [];
    this.r1QuestionIndex = 0;
    this.r1Stage = 'IDLE';
    this.r1BuzzerQueue = [];
    this.r1ActiveAttempt = 0;
    this.r1CurrentTurn = null;
    this.r1SelectedAnswer = null;
    if (this.r1TurnTimer) clearInterval(this.r1TurnTimer);

    this.r2CurrentPieceIndex = -1;
    this.r2Stage = 'IDLE';
    this.r2PiecesUnlocked = [false, false, false, false, false, false];
    this.r2KeywordSolved = false;
    this.r2KeywordWinner = null;
    this.r2BuzzerQueue = [];
    this.r2ActiveAttempt = 0;
    this.r2CurrentTurn = null;
    this.r2KeywordTurn = null;

    this.r3Stage = 'IDLE';
    this.r3BetTimeLeft = 10;
    if (this.r3BetTimer) clearInterval(this.r3BetTimer);
    this.r3Bets = {};
    this.r3BuzzerQueue = [];
    this.r3CurrentTurn = null;
    this.r3SelectedAnswer = null;
    this.finaleStep = 0;

    this.logEvent('SYSTEM', 'Trận đấu đã được khởi tạo lại về trạng thái ban đầu');
  }

  getPublicState() {
    return {
      roomCode: this.roomCode,
      status: this.status,
      paused: this.paused,
      teams: this.teams,
      localIP,
      publicBaseUrl,
      playerUrl: defaultPlayerUrl,
      qrUrl: playerQrDataUrl,
      eventLog: this.eventLog.slice(0, 30),
      // Round 1
      r1: {
        questionIndex: this.r1QuestionIndex,
        totalQuestions: this.questions.round1.length,
        currentQuestion: this.questions.round1[this.r1QuestionIndex] || null,
        stage: this.r1Stage,
        buzzerQueue: this.r1BuzzerQueue,
        activeAttempt: this.r1ActiveAttempt,
        currentTurn: this.r1CurrentTurn,
        selectedAnswer: this.r1SelectedAnswer,
        timeLeft: this.r1TurnTimeLeft
      },
      // Round 2
      r2: {
        pieceIndex: this.r2CurrentPieceIndex,
        stage: this.r2Stage,
        piecesUnlocked: this.r2PiecesUnlocked,
        keywordSolved: this.r2KeywordSolved,
        keywordWinner: this.r2KeywordWinner,
        keyword: this.questions.round2.keyword,
        keywordHints: this.questions.round2.keywordHints,
        keywordExplanation: this.questions.round2.keywordExplanation,
        currentPiece: this.r2CurrentPieceIndex >= 0 ? this.questions.round2.pieces[this.r2CurrentPieceIndex] : null,
        buzzerQueue: this.r2BuzzerQueue,
        activeAttempt: this.r2ActiveAttempt,
        currentTurn: this.r2CurrentTurn,
        keywordTurn: this.r2KeywordTurn,
        timeLeft: this.r1TurnTimeLeft
      },
      // Round 3
      r3: {
        stage: this.r3Stage,
        betTimeLeft: this.r3BetTimeLeft,
        bets: this.r3Bets,
        question: this.questions.round3.question,
        buzzerQueue: this.r3BuzzerQueue,
        currentTurn: this.r3CurrentTurn,
        selectedAnswer: this.r3SelectedAnswer,
        timeLeft: this.r1TurnTimeLeft
      },
      // Finale
      finale: {
        step: this.finaleStep,
        leaderboard: this.computeLeaderboard()
      }
    };
  }

  computeLeaderboard() {
    // Rank teams by total score, tie break: round 1 score, then round 3 correct answers
    const list = [...this.teams].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.r1Score !== a.r1Score) return b.r1Score - a.r1Score;
      return (b.answerCount || 0) - (a.answerCount || 0);
    });

    const result = [];
    for (let i = 0; i < list.length; i++) {
      const team = { ...list[i] };
      if (i > 0) {
        const prev = result[i - 1];
        if (prev.score === team.score && prev.r1Score === team.r1Score) {
          team.rank = prev.rank;
          team.isTie = true;
        } else {
          team.rank = i + 1;
          team.isTie = false;
        }
      } else {
        team.rank = 1;
        team.isTie = false;
      }
      result.push(team);
    }
    return result;
  }

  // Timer helpers for 5-second answer window
  startTurnCountdown(onTick, onEnd) {
    if (this.r1TurnTimer) clearInterval(this.r1TurnTimer);
    this.r1TurnTimeLeft = 5;
    this.r1TurnTimer = setInterval(() => {
      if (this.paused) return;
      this.r1TurnTimeLeft -= 1;
      if (onTick) onTick(this.r1TurnTimeLeft);
      if (this.r1TurnTimeLeft <= 0) {
        clearInterval(this.r1TurnTimer);
        this.r1TurnTimer = null;
        if (onEnd) onEnd();
      }
    }, 1000);
  }

  stopTurnCountdown() {
    if (this.r1TurnTimer) {
      clearInterval(this.r1TurnTimer);
      this.r1TurnTimer = null;
    }
  }
}

const game = new GameRoom();

// Broadcast helper
function broadcastState(soundCue = null) {
  const publicState = game.getPublicState();
  io.emit('game_state', publicState);
  io.emit('gameState', publicState);

  const q = (publicState.r1 && publicState.r1.buzzerQueue) || 
            (publicState.r2 && publicState.r2.buzzerQueue) || 
            (publicState.r3 && publicState.r3.buzzerQueue) || [];
  io.emit('buzzerQueue', q);
  io.emit('logs', publicState.eventLog);

  if (soundCue) {
    io.emit('play_sound', soundCue);
  }
}

// REST Endpoints
app.get('/api/state', (req, res) => {
  res.json(game.getPublicState());
});

app.get('/api/questions', (req, res) => {
  res.json(game.questions);
});

app.post('/api/questions', (req, res) => {
  const updated = req.body;
  if (!updated || !updated.round1 || !updated.round2 || !updated.round3) {
    return res.status(400).json({ success: false, message: 'Dữ liệu câu hỏi không hợp lệ' });
  }
  const ok = saveQuestions(updated);
  if (ok) {
    game.questions = updated;
    game.logEvent('MC', 'Cập nhật ngân hàng câu hỏi thành công');
    broadcastState();
    res.json({ success: true, message: 'Lưu ngân hàng câu hỏi thành công!' });
  } else {
    res.status(500).json({ success: false, message: 'Không thể ghi file questions.json' });
  }
});

// Serve frontend views
app.get('/mc', (req, res) => res.sendFile(path.join(__dirname, 'public', 'mc.html')));
app.get('/projector', (req, res) => res.sendFile(path.join(__dirname, 'public', 'projector.html')));
app.get('/player', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player.html')));
app.get('/sandbox', (req, res) => res.sendFile(path.join(__dirname, 'public', 'sandbox.html')));

// Dynamic QR generator matching actual browser client origin
app.get('/api/player-qr', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const origin = req.query.origin || process.env.RENDER_EXTERNAL_URL || `${proto}://${host}`;
  const cleanOrigin = origin.replace(/\/$/, '');
  const targetPlayerUrl = `${cleanOrigin}/player`;
  QRCode.toDataURL(targetPlayerUrl, { margin: 1, width: 280, color: { dark: '#120722', light: '#FFD700' } }, (err, url) => {
    if (err) return res.status(500).json({ error: 'QR Generation failed' });
    res.json({ playerUrl: targetPlayerUrl, qrUrl: url });
  });
});

// Socket.io Events
io.on('connection', (socket) => {
  const publicState = game.getPublicState();
  socket.emit('game_state', publicState);
  socket.emit('gameState', publicState);
  const q = (publicState.r1 && publicState.r1.buzzerQueue) || 
            (publicState.r2 && publicState.r2.buzzerQueue) || 
            (publicState.r3 && publicState.r3.buzzerQueue) || [];
  socket.emit('buzzerQueue', q);
  socket.emit('logs', publicState.eventLog);

  // 1. Team Registration / Reconnect
  socket.on('team_join', ({ teamId, roomCode }) => {
    if (roomCode && roomCode.toUpperCase() !== game.roomCode.toUpperCase()) {
      return socket.emit('join_error', 'Mã phòng không chính xác!');
    }
    const team = game.getTeam(teamId);
    if (!team) {
      return socket.emit('join_error', 'Không tìm thấy đội!');
    }
    team.connected = true;
    team.socketId = socket.id;
    socket.teamId = teamId;
    game.logEvent('CONNECTION', `${team.name} đã kết nối vào phòng thi đấu`);
    broadcastState();
    socket.emit('join_success', { team, roomCode: game.roomCode });
  });

  socket.on('disconnect', () => {
    if (socket.teamId) {
      const team = game.getTeam(socket.teamId);
      if (team && team.socketId === socket.id) {
        team.connected = false;
        team.socketId = null;
        game.logEvent('CONNECTION', `${team.name} đã ngắt kết nối`);
        broadcastState();
      }
    }
  });

  // 2. MC Admin Controls (Supports both mc_action and mcAction, with object or nested payload)
  const mcHandler = (data) => {
    if (!data) return;
    const action = data.action;
    const payload = data.payload !== undefined ? data.payload : data;
    handleMcAction(action, payload);
  };
  socket.on('mc_action', mcHandler);
  socket.on('mcAction', mcHandler);
  socket.on('mc:auth', (data, cb) => {
    if (typeof cb === 'function') cb({ ok: true });
  });

  // 3. Player Buzzer Event
  socket.on('player_buzz', ({ teamId, buzzerType = 'NORMAL' }) => {
    handlePlayerBuzz(teamId, buzzerType);
  });

  // 4. Player Answer Selection
  socket.on('player_select_answer', ({ teamId, answerIndex }) => {
    handlePlayerSelectAnswer(teamId, answerIndex);
  });

  // 5. Player Wager Submission (Round 3)
  socket.on('player_submit_wager', ({ teamId, wager }) => {
    handlePlayerSubmitWager(teamId, wager);
  });
});

// Centralized MC Game Master actions
function handleMcAction(action, payload) {
  switch (action) {
    case 'START_ROUND1':
    case 'START_GAME': {
      game.status = 'ROUND1';
      game.r1QuestionIndex = 0;
      game.r1Stage = 'IDLE';
      game.logEvent('MC', 'Bắt đầu cuộc thi! Tiến vào Vòng 1: Chuông Vàng Tri Thức');
      broadcastState('bell');
      break;
    }

    case 'TOGGLE_PAUSE': {
      game.paused = !game.paused;
      game.logEvent('MC', game.paused ? 'Đã tạm dừng trận đấu' : 'Đã tiếp tục trận đấu');
      broadcastState();
      break;
    }

    case 'RESET_GAME': {
      game.resetRoom(true);
      broadcastState();
      break;
    }

    case 'UPDATE_TEAM_NAME': {
      const { teamId, newName } = payload;
      const team = game.getTeam(teamId);
      if (team && newName && newName.trim()) {
        const oldName = team.name;
        team.name = newName.trim();
        game.logEvent('MC', `Đổi tên đội ${oldName} thành ${team.name}`);
        broadcastState();
      }
      break;
    }

    case 'OVERRIDE_SCORE': {
      const { teamId, delta, reason } = payload;
      const team = game.getTeam(teamId);
      if (team) {
        team.score = Math.max(0, team.score + Number(delta));
        game.logEvent('MC_OVERRIDE', `MC điều chỉnh điểm ${team.name}: ${delta >= 0 ? '+' : ''}${delta}đ (${reason || 'Can thiệp thủ công'})`);
        broadcastState(delta > 0 ? 'correct' : 'wrong');
      }
      break;
    }

    // --- ROUND 1 ACTIONS ---
    case 'R1_OPEN_AND_BUZZ': {
      const { index } = payload;
      if (typeof index === 'number') game.r1QuestionIndex = index;
      game.r1Stage = 'BUZZER_OPEN';
      game.r1BuzzerQueue = [];
      game.r1ActiveAttempt = 0;
      game.r1CurrentTurn = null;
      game.r1SelectedAnswer = null;
      game.teams.forEach(t => (t.locked = false));
      game.stopTurnCountdown();
      game.logEvent('GAME', `Vòng 1: Mở Câu hỏi ${game.r1QuestionIndex + 1} & Bật chuông thi đấu ngay!`);
      broadcastState('bell');
      break;
    }

    case 'R1_OPEN_QUESTION': {
      const { index } = payload;
      if (typeof index === 'number') game.r1QuestionIndex = index;
      game.r1Stage = 'QUESTION_OPEN';
      game.r1BuzzerQueue = [];
      game.r1ActiveAttempt = 0;
      game.r1CurrentTurn = null;
      game.r1SelectedAnswer = null;
      game.teams.forEach(t => (t.locked = false));
      game.stopTurnCountdown();
      game.logEvent('GAME', `Vòng 1: Mở Câu hỏi ${game.r1QuestionIndex + 1}`);
      broadcastState();
      break;
    }

    case 'R1_START_BUZZER': {
      game.r1Stage = 'BUZZER_OPEN';
      game.r1BuzzerQueue = [];
      game.r1ActiveAttempt = 0;
      game.r1CurrentTurn = null;
      game.r1SelectedAnswer = null;
      game.teams.forEach(t => (t.locked = false));
      game.logEvent('GAME', `Chuông vàng đã mở cho Câu ${game.r1QuestionIndex + 1}! Các đội hãy bấm chuông!`);
      broadcastState('bell');
      break;
    }

    case 'R1_CONFIRM_CORRECT': {
      if (!game.r1CurrentTurn) return;
      const team = game.getTeam(game.r1CurrentTurn);
      const pointsTable = [30, 20, 10];
      const pts = pointsTable[game.r1ActiveAttempt] || 10;
      if (team) {
        team.score += pts;
        team.r1Score += pts;
        team.answerCount = (team.answerCount || 0) + 1;
        game.logEvent('ANSWER', `CHÍNH XÁC! ${team.name} nhận +${pts} điểm ở câu ${game.r1QuestionIndex + 1}`);
      }
      game.stopTurnCountdown();
      game.r1Stage = 'REVEALED';
      broadcastState('correct');
      break;
    }

    case 'R1_CONFIRM_WRONG': {
      handleR1WrongOrTimeout();
      break;
    }

    case 'R1_FORCE_REVEAL': {
      game.stopTurnCountdown();
      game.r1Stage = 'REVEALED';
      game.logEvent('MC', `MC công bố đáp án cho câu ${game.r1QuestionIndex + 1}`);
      broadcastState();
      break;
    }

    case 'R1_NEXT_QUESTION': {
      if (game.r1QuestionIndex < game.questions.round1.length - 1) {
        game.r1QuestionIndex += 1;
        game.r1Stage = 'QUESTION_OPEN';
        game.r1BuzzerQueue = [];
        game.r1ActiveAttempt = 0;
        game.r1CurrentTurn = null;
        game.r1SelectedAnswer = null;
        game.teams.forEach(t => (t.locked = false));
        game.stopTurnCountdown();
        game.logEvent('GAME', `Chuyển sang Câu hỏi số ${game.r1QuestionIndex + 1}`);
        broadcastState();
      } else {
        // Finish round 1
        game.status = 'ROUND1_RECAP';
        game.stopTurnCountdown();
        game.logEvent('GAME', 'Hoàn thành Vòng 1! Tổng kết bảng điểm Khởi động');
        broadcastState('victory');
      }
      break;
    }

    case 'GO_TO_ROUND2': {
      game.status = 'ROUND2';
      game.r2CurrentPieceIndex = -1;
      game.r2Stage = 'IDLE';
      game.r2BuzzerQueue = [];
      game.r2CurrentTurn = null;
      game.r2KeywordTurn = null;
      game.teams.forEach(t => {
        t.locked = false;
        t.keywordLocked = false;
      });
      game.logEvent('MC', 'Tiến vào Vòng 2: Giải Mã Bức Tranh Bí Ẩn!');
      broadcastState('bell');
      break;
    }

    // --- ROUND 2 ACTIONS ---
    case 'R2_SELECT_PIECE': {
      const { pieceIndex } = payload;
      if (pieceIndex >= 0 && pieceIndex < 6) {
        game.r2CurrentPieceIndex = pieceIndex;
        game.r2Stage = 'PIECE_QUESTION';
        game.r2BuzzerQueue = [];
        game.r2ActiveAttempt = 0;
        game.r2CurrentTurn = null;
        game.teams.forEach(t => (t.locked = false));
        game.stopTurnCountdown();
        game.logEvent('GAME', `Vòng 2: Mở câu hỏi Mảnh ghép số ${pieceIndex + 1}`);
        broadcastState();
      }
      break;
    }

    case 'R2_START_PIECE_BUZZER': {
      game.r2Stage = 'PIECE_BUZZER';
      game.r2BuzzerQueue = [];
      game.r2ActiveAttempt = 0;
      game.r2CurrentTurn = null;
      game.teams.forEach(t => (t.locked = false));
      game.logEvent('GAME', `Mở chuông mảnh ghép số ${game.r2CurrentPieceIndex + 1}!`);
      broadcastState('bell');
      break;
    }

    case 'R2_CONFIRM_PIECE_CORRECT': {
      if (!game.r2CurrentTurn) return;
      const team = game.getTeam(game.r2CurrentTurn);
      const pts = game.r2ActiveAttempt === 0 ? 20 : 10;
      if (team) {
        team.score += pts;
        team.r2Score += pts;
        team.answerCount = (team.answerCount || 0) + 1;
        game.logEvent('ANSWER', `CHÍNH XÁC! ${team.name} mở thành công Mảnh ghép ${game.r2CurrentPieceIndex + 1} (+${pts}đ)`);
      }
      game.stopTurnCountdown();
      if (game.r2CurrentPieceIndex >= 0) {
        game.r2PiecesUnlocked[game.r2CurrentPieceIndex] = true;
      }
      game.r2Stage = 'PIECE_REVEALED';
      broadcastState('puzzle_unlock');
      break;
    }

    case 'R2_CONFIRM_PIECE_WRONG': {
      handleR2PieceWrongOrTimeout();
      break;
    }

    case 'R2_FORCE_UNLOCK_PIECE': {
      if (game.r2CurrentPieceIndex >= 0) {
        game.r2PiecesUnlocked[game.r2CurrentPieceIndex] = true;
        game.r2Stage = 'PIECE_REVEALED';
        game.stopTurnCountdown();
        game.logEvent('MC', `MC chủ động mở Mảnh ghép số ${game.r2CurrentPieceIndex + 1}`);
        broadcastState('puzzle_unlock');
      }
      break;
    }

    case 'R2_CONFIRM_KEYWORD_CORRECT': {
      if (!game.r2KeywordTurn) return;
      const team = game.getTeam(game.r2KeywordTurn);
      if (team) {
        team.score += 100;
        team.r2Score += 100;
        team.answerCount = (team.answerCount || 0) + 1;
        game.r2KeywordSolved = true;
        game.r2KeywordWinner = team.id;
        game.r2PiecesUnlocked = [true, true, true, true, true, true]; // reveal entire picture!
        game.logEvent('KEYWORD', `XUẤT SẮC! ${team.name} đã giải mã thành công từ khóa "${game.questions.round2.keyword}" (+100 ĐIỂM)!`);
      }
      game.r2KeywordTurn = null;
      game.r2Stage = 'IDLE';
      broadcastState('victory');
      break;
    }

    case 'R2_CONFIRM_KEYWORD_WRONG': {
      if (!game.r2KeywordTurn) return;
      const team = game.getTeam(game.r2KeywordTurn);
      if (team) {
        team.keywordLocked = true;
        game.logEvent('KEYWORD', `${team.name} đoán từ khóa chưa chính xác và mất quyền bấm chuông từ khóa trong Vòng 2`);
      }
      game.r2KeywordTurn = null;
      game.r2Stage = 'IDLE';
      broadcastState('wrong');
      break;
    }

    case 'R2_FINISH_ROUND': {
      game.status = 'ROUND2_RECAP';
      game.r2PiecesUnlocked = [true, true, true, true, true, true]; // fully show picture
      game.stopTurnCountdown();
      game.logEvent('GAME', 'Tổng kết Vòng 2: Bức Tranh Bí Ẩn đã được giải mã!');
      broadcastState('victory');
      break;
    }

    case 'GO_TO_ROUND3': {
      game.status = 'ROUND3_BET';
      game.r3Stage = 'BETTING';
      game.r3BetTimeLeft = 10;
      game.r3Bets = {};
      game.teams.forEach(t => {
        t.locked = false;
        t.r3Wager = 0;
      });
      game.logEvent('MC', 'Bắt đầu Vòng 3: Về Đích! Thời gian 10 giây đặt cược bắt đầu!');
      startR3BetTimer();
      broadcastState('bell');
      break;
    }

    // --- ROUND 3 ACTIONS ---
    case 'R3_FORCE_LOCK_BETS': {
      lockR3Bets();
      break;
    }

    case 'R3_START_TRANSITION': {
      game.r3Stage = 'TRANSITION';
      game.logEvent('GAME', '3 giây chuyển cảnh hé lộ điểm cược...');
      broadcastState('wager_lock');
      setTimeout(() => {
        game.r3Stage = 'REVEAL_BETS';
        game.logEvent('GAME', 'Công bố bảng cược điểm của 5 đội!');
        broadcastState('bell');
      }, 3000);
      break;
    }

    case 'R3_OPEN_QUESTION': {
      game.r3Stage = 'QUESTION';
      game.r3BuzzerQueue = [];
      game.r3CurrentTurn = null;
      game.r3SelectedAnswer = null;
      game.teams.forEach(t => (t.locked = false));
      game.stopTurnCountdown();
      game.logEvent('GAME', 'Mở Câu hỏi thử thách Vòng 3! Bấm chuông giành quyền trả lời!');
      broadcastState('bell');
      break;
    }

    case 'R3_CONFIRM_CORRECT': {
      if (!game.r3CurrentTurn) return;
      const team = game.getTeam(game.r3CurrentTurn);
      const wager = game.r3Bets[team.id] || 0;
      if (team) {
        team.score += wager;
        team.r3Result = wager;
        team.answerCount = (team.answerCount || 0) + 1;
        game.logEvent('R3_RESULT', `QUYẾT ĐỊNH CHÍNH XÁC! ${team.name} trả lời đúng và nhận trọn vẹn +${wager} điểm cược!`);
      }
      game.stopTurnCountdown();
      game.r3Stage = 'REVEALED';
      broadcastState('correct');
      break;
    }

    case 'R3_CONFIRM_WRONG': {
      handleR3WrongOrTimeout();
      break;
    }

    case 'R3_FINISH': {
      game.status = 'FINALE_SUSPENSE';
      game.finaleStep = 1;
      game.stopTurnCountdown();
      game.logEvent('GAME', 'Trận đấu khép lại! Sân khấu đóng băng chuẩn bị vinh danh Quán quân!');
      broadcastState('bell');
      break;
    }

    // --- FINALE TOP 3 PODIUM ACTIONS ---
    case 'FINALE_NEXT_STEP': {
      if (game.finaleStep < 5) {
        game.finaleStep += 1;
        if (game.finaleStep === 2) {
          game.status = 'FINALE_RANK_3';
          game.logEvent('FINALE', 'Công bố & Vinh danh Hạng 3 (Huy Chương Đồng)');
          broadcastState('bell');
        } else if (game.finaleStep === 3) {
          game.status = 'FINALE_RANK_2';
          game.logEvent('FINALE', 'Công bố & Vinh danh Hạng 2 (Huy Chương Bạc)');
          broadcastState('bell');
        } else if (game.finaleStep === 4) {
          game.status = 'FINALE_CHAMPION';
          game.logEvent('FINALE', 'VINH DANH QUÁN QUÂN RUNG CHUÔNG VÀNG (Cúp Vàng Vô Địch)!');
          broadcastState('victory');
        } else if (game.finaleStep >= 5) {
          game.status = 'FINALE_PODIUM_TOP3';
          game.logEvent('FINALE', 'Đại sân khấu Bục Podium Top 3 & Bảng vàng danh dự toàn trận');
          broadcastState('victory');
        }
      }
      break;
    }
  }
}

// 10s Wager Countdown in Round 3
function startR3BetTimer() {
  if (game.r3BetTimer) clearInterval(game.r3BetTimer);
  game.r3BetTimeLeft = 10;
  game.r3BetTimer = setInterval(() => {
    if (game.paused) return;
    game.r3BetTimeLeft -= 1;
    if (game.r3BetTimeLeft <= 3 && game.r3BetTimeLeft > 0) {
      io.emit('play_sound', 'urgent_tick');
    } else if (game.r3BetTimeLeft > 0) {
      io.emit('play_sound', 'tick');
    }

    io.emit('bet_timer_tick', { timeLeft: game.r3BetTimeLeft });

    if (game.r3BetTimeLeft <= 0) {
      clearInterval(game.r3BetTimer);
      game.r3BetTimer = null;
      lockR3Bets();
    }
  }, 1000);
}

function lockR3Bets() {
  if (game.r3BetTimer) {
    clearInterval(game.r3BetTimer);
    game.r3BetTimer = null;
  }
  // Auto-set 0 for teams that didn't confirm
  game.teams.forEach(t => {
    if (game.r3Bets[t.id] === undefined) {
      game.r3Bets[t.id] = 0;
      t.r3Wager = 0;
    }
  });
  game.logEvent('GAME', 'Hết thời gian đặt cược! Hệ thống đã khóa tất cả lựa chọn cược.');
  // Trigger 3s dramatic transition automatically
  handleMcAction('R3_START_TRANSITION', {});
}

// Player Buzzer Handler
function handlePlayerBuzz(teamId, buzzerType) {
  if (game.paused) return;
  const team = game.getTeam(teamId);
  if (!team || team.locked) return;

  const serverTime = Date.now();

  // Round 1 Buzzer
  if (game.status === 'ROUND1' && game.r1Stage === 'BUZZER_OPEN') {
    // Check if already in queue
    if (game.r1BuzzerQueue.some(b => b.teamId === teamId)) return;

    game.r1BuzzerQueue.push({ teamId, timestamp: serverTime, teamName: team.name, color: team.color });
    game.logEvent('BUZZER', `${team.name} đã bấm chuông giành quyền! (${game.r1BuzzerQueue.length})`);

    // If this is the first team in queue, award turn immediately!
    if (game.r1BuzzerQueue.length === 1) {
      grantR1Turn(teamId);
    } else {
      broadcastState('buzzer');
    }
    return;
  }

  // Round 2 Buzzer
  if (game.status === 'ROUND2') {
    // 2.1 Keyword buzzer
    if (buzzerType === 'KEYWORD') {
      if (team.keywordLocked || game.r2KeywordSolved || game.r2KeywordTurn) return;
      game.r2KeywordTurn = teamId;
      game.r2Stage = 'KEYWORD_GUESSING';
      game.stopTurnCountdown();
      game.logEvent('KEYWORD', `CHUÔNG TỪ KHÓA! ${team.name} bấm chuông giải mã từ khóa chủ đề!`);
      broadcastState('bell');
      return;
    }

    // 2.2 Piece buzzer
    if (buzzerType === 'PIECE' || buzzerType === 'NORMAL') {
      if (game.r2Stage === 'PIECE_BUZZER' && !game.r2KeywordTurn) {
        if (game.r2BuzzerQueue.some(b => b.teamId === teamId)) return;
        game.r2BuzzerQueue.push({ teamId, timestamp: serverTime, teamName: team.name, color: team.color });
        game.logEvent('BUZZER', `${team.name} bấm chuông mảnh ghép (${game.r2BuzzerQueue.length})`);
        if (game.r2BuzzerQueue.length === 1) {
          grantR2Turn(teamId);
        } else {
          broadcastState('buzzer');
        }
      }
    }
    return;
  }

  // Round 3 Buzzer
  if (game.status === 'ROUND3_BET' && game.r3Stage === 'QUESTION') {
    if (game.r3BuzzerQueue.some(b => b.teamId === teamId)) return;
    game.r3BuzzerQueue.push({ teamId, timestamp: serverTime, teamName: team.name, color: team.color });
    game.logEvent('BUZZER', `${team.name} bấm chuông quyết định Vòng 3!`);
    if (game.r3BuzzerQueue.length === 1) {
      grantR3Turn(teamId);
    } else {
      broadcastState('buzzer');
    }
  }
}

// Turn Granting Helpers
function grantR1Turn(teamId) {
  game.r1CurrentTurn = teamId;
  game.r1SelectedAnswer = null;
  game.r1Stage = 'ANSWERING';
  const team = game.getTeam(teamId);
  game.logEvent('TURN', `Lượt trả lời cấp cho ${team ? team.name : teamId} (5 giây)`);
  broadcastState('bell');

  game.startTurnCountdown(
    (left) => {
      io.emit('turn_timer_tick', { timeLeft: left });
    },
    () => {
      // Timeout
      game.logEvent('TIMEOUT', `${team ? team.name : teamId} hết thời gian 5s trả lời!`);
      handleR1WrongOrTimeout();
    }
  );
}

function handleR1WrongOrTimeout() {
  game.stopTurnCountdown();
  if (game.r1CurrentTurn) {
    const team = game.getTeam(game.r1CurrentTurn);
    if (team) {
      team.locked = true;
      game.logEvent('WRONG', `${team.name} trả lời sai hoặc hết giờ cho câu ${game.r1QuestionIndex + 1}`);
    }
  }

  game.r1ActiveAttempt += 1;
  // If we have next team in buzzer queue and attempts < 3
  if (game.r1ActiveAttempt < 3 && game.r1BuzzerQueue[game.r1ActiveAttempt]) {
    const nextBuzzer = game.r1BuzzerQueue[game.r1ActiveAttempt];
    grantR1Turn(nextBuzzer.teamId);
  } else if (game.r1ActiveAttempt < 3) {
    // Wait for other teams to buzz
    game.r1CurrentTurn = null;
    game.r1Stage = 'BUZZER_OPEN';
    broadcastState('wrong');
  } else {
    // All 3 attempts failed -> reveal answer, no points
    game.r1Stage = 'REVEALED';
    game.r1CurrentTurn = null;
    game.logEvent('GAME', `Cả 3 lượt trả lời đều không chính xác. Công bố đáp án câu ${game.r1QuestionIndex + 1}`);
    broadcastState('wrong');
  }
}

function grantR2Turn(teamId) {
  game.r2CurrentTurn = teamId;
  game.r2Stage = 'PIECE_ANSWERING';
  const team = game.getTeam(teamId);
  game.logEvent('TURN', `Lượt trả lời Mảnh ghép ${game.r2CurrentPieceIndex + 1} cấp cho ${team ? team.name : teamId}`);
  broadcastState('bell');

  game.startTurnCountdown(
    (left) => io.emit('turn_timer_tick', { timeLeft: left }),
    () => {
      game.logEvent('TIMEOUT', `${team ? team.name : teamId} hết giờ trả lời mảnh ghép!`);
      handleR2PieceWrongOrTimeout();
    }
  );
}

function handleR2PieceWrongOrTimeout() {
  game.stopTurnCountdown();
  if (game.r2CurrentTurn) {
    const team = game.getTeam(game.r2CurrentTurn);
    if (team) team.locked = true;
  }
  game.r2ActiveAttempt += 1;
  if (game.r2ActiveAttempt < 2 && game.r2BuzzerQueue[game.r2ActiveAttempt]) {
    grantR2Turn(game.r2BuzzerQueue[game.r2ActiveAttempt].teamId);
  } else if (game.r2ActiveAttempt < 2) {
    game.r2CurrentTurn = null;
    game.r2Stage = 'PIECE_BUZZER';
    broadcastState('wrong');
  } else {
    game.r2Stage = 'PIECE_REVEALED';
    game.r2CurrentTurn = null;
    game.logEvent('GAME', `Hết lượt trả lời cho Mảnh ghép ${game.r2CurrentPieceIndex + 1}.`);
    broadcastState('wrong');
  }
}

function grantR3Turn(teamId) {
  game.r3CurrentTurn = teamId;
  game.r3SelectedAnswer = null;
  game.r3Stage = 'ANSWERING';
  const team = game.getTeam(teamId);
  game.logEvent('TURN', `Quyền trả lời câu hỏi quyết định thuộc về ${team ? team.name : teamId}`);
  broadcastState('bell');

  game.startTurnCountdown(
    (left) => io.emit('turn_timer_tick', { timeLeft: left }),
    () => {
      game.logEvent('TIMEOUT', `${team ? team.name : teamId} hết thời gian trả lời câu hỏi Vòng 3!`);
      handleR3WrongOrTimeout();
    }
  );
}

function handleR3WrongOrTimeout() {
  game.stopTurnCountdown();
  if (game.r3CurrentTurn) {
    const team = game.getTeam(game.r3CurrentTurn);
    const wager = game.r3Bets[team.id] || 0;
    if (team) {
      team.score = Math.max(0, team.score - wager);
      team.r3Result = -wager;
      team.locked = true;
      game.logEvent('R3_RESULT', `${team.name} trả lời không chính xác, bị trừ -${wager} điểm cược!`);
    }
  }

  // Next in queue?
  const currentIndex = game.r3BuzzerQueue.findIndex(b => b.teamId === game.r3CurrentTurn);
  const next = game.r3BuzzerQueue[currentIndex + 1];
  if (next) {
    grantR3Turn(next.teamId);
  } else {
    game.r3CurrentTurn = null;
    game.r3Stage = 'QUESTION';
    broadcastState('wrong');
  }
}

// Player Action: Select Answer
function handlePlayerSelectAnswer(teamId, answerIndex) {
  if (game.paused) return;
  // Round 1
  if (game.status === 'ROUND1' && game.r1CurrentTurn === teamId && game.r1Stage === 'ANSWERING') {
    game.r1SelectedAnswer = answerIndex;
    const team = game.getTeam(teamId);
    game.logEvent('SELECT', `${team ? team.name : teamId} đã chọn phương án [${['A', 'B', 'C', 'D'][answerIndex]}]`);
    broadcastState();
    return;
  }
  // Round 3
  if (game.status === 'ROUND3_BET' && game.r3CurrentTurn === teamId && game.r3Stage === 'ANSWERING') {
    game.r3SelectedAnswer = answerIndex;
    const team = game.getTeam(teamId);
    game.logEvent('SELECT', `${team ? team.name : teamId} đã chọn phương án [${['A', 'B', 'C', 'D'][answerIndex]}]`);
    broadcastState();
  }
}

// Player Action: Submit Wager
function handlePlayerSubmitWager(teamId, wager) {
  if (game.status !== 'ROUND3_BET' || game.r3Stage !== 'BETTING') return;
  const team = game.getTeam(teamId);
  if (!team) return;

  const cleanWager = Math.floor(Number(wager)) || 0;
  // Constraint: 0 <= wager <= team.score
  const validatedWager = Math.max(0, Math.min(team.score, cleanWager));

  game.r3Bets[teamId] = validatedWager;
  team.r3Wager = validatedWager;
  game.logEvent('WAGER', `${team.name} đã xác nhận mức cược hợp lệ: ${validatedWager} điểm`);
  broadcastState('wager_lock');
}

// Health check endpoints for Render / Cloud load balancers
app.get('/healthz', (req, res) => res.status(200).send('OK'));
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Start Primary Server
server.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  RUNG CHUÔNG VÀNG SERVER RUNNING!`);
  console.log(`  Local Address:     http://localhost:${PORT}`);
  console.log(`  Network (Phones):  ${defaultPlayerUrl}`);
  console.log(`  MC Control:        http://localhost:${PORT}/mc`);
  console.log(`  Projector:         http://localhost:${PORT}/projector`);
  console.log(`  5-Device Sandbox:  http://localhost:${PORT}/sandbox`);
  console.log(`=======================================================`);
});

// Bind secondary fallback ports (3000, 3001, 10000) so Render probes always succeed
const fallbackPorts = [3000, 3001, 10000].filter(p => Number(p) !== Number(PORT));
fallbackPorts.forEach(port => {
  try {
    const fallbackServer = http.createServer(app);
    io.attach(fallbackServer);
    fallbackServer.listen(port, '0.0.0.0', () => {
      console.log(`  [Cloud Port Guard] Also listening on port ${port} for load-balancer routing.`);
    });
    fallbackServer.on('error', () => {
      // Ignored safely if port is already taken or unavailable
    });
  } catch (e) {}
});
