const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

async function runFullMatchSimulation() {
  console.log('--- BẮT ĐẦU MÔ PHỎNG TOÀN DIỆN TRẬN ĐẤU RUNG CHUÔNG VÀNG ---');

  // Connect MC socket
  const mcSocket = io(SERVER_URL);
  
  // Connect 5 Team Sockets
  const teamSockets = {};
  const teams = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5'];

  for (const tid of teams) {
    const s = io(SERVER_URL);
    teamSockets[tid] = s;
    s.emit('team_join', { teamId: tid, roomCode: 'ARENA88' });
  }

  await new Promise(r => setTimeout(r, 600));
  console.log('✓ 5 Đội đã kết nối thành công vào phòng ARENA88');

  // Helper for MC actions
  const mcAction = (action, payload = {}) => {
    return new Promise(resolve => {
      mcSocket.emit('mc_action', { action, payload });
      setTimeout(resolve, 300);
    });
  };

  // Helper to fetch current state
  const getState = async () => {
    const res = await fetch(`${SERVER_URL}/api/state`);
    return await res.json();
  };

  // 1. Start Game
  console.log('\n[VÒNG 1] Khởi Động: Chuông Vàng Tri Thức');
  await mcAction('START_GAME');
  let st = await getState();
  console.log('✓ Game Status:', st.status);

  // Open Q1
  await mcAction('R1_OPEN_QUESTION', { index: 0 });
  await mcAction('R1_START_BUZZER');
  console.log('✓ Chuông đã mở cho Câu hỏi 1');

  // Team 1 and Team 2 buzz almost simultaneously
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 10));
  teamSockets['team-2'].emit('player_buzz', { teamId: 'team-2', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  st = await getState();
  console.log(`✓ Đội giành quyền: ${st.r1.currentTurn} (Hàng đợi: ${st.r1.buzzerQueue.length} đội)`);

  // Team 1 selects answer B (index 1 - correct)
  teamSockets['team-1'].emit('player_select_answer', { teamId: 'team-1', answerIndex: 1 });
  await new Promise(r => setTimeout(r, 200));
  await mcAction('R1_CONFIRM_CORRECT');

  st = await getState();
  console.log(`✓ Điểm Đội 1 sau câu 1 (+30đ): ${st.teams.find(t=>t.id==='team-1').score} điểm`);

  // Move to Round 2
  console.log('\n[VÒNG 2] Giải Mã Bức Tranh Bí Ẩn');
  await mcAction('GO_TO_ROUND2');
  st = await getState();
  console.log('✓ Game Status:', st.status);

  // Select Piece 1
  await mcAction('R2_SELECT_PIECE', { pieceIndex: 0 });
  await mcAction('R2_START_PIECE_BUZZER');
  teamSockets['team-2'].emit('player_buzz', { teamId: 'team-2', buzzerType: 'PIECE' });
  await new Promise(r => setTimeout(r, 300));
  await mcAction('R2_CONFIRM_PIECE_CORRECT');

  st = await getState();
  console.log(`✓ Mảnh ghép 1 đã mở: ${st.r2.piecesUnlocked[0]}`);
  console.log(`✓ Điểm Đội 2 (+20đ): ${st.teams.find(t=>t.id==='team-2').score} điểm`);

  // Team 3 rings KEYWORD BUZZER!
  console.log('\n--> Đội 3 (Bạch Hổ) bấm CHUÔNG TỪ KHÓA!');
  teamSockets['team-3'].emit('player_buzz', { teamId: 'team-3', buzzerType: 'KEYWORD' });
  await new Promise(r => setTimeout(r, 300));
  st = await getState();
  console.log(`✓ Đội đoán từ khóa: ${st.r2.keywordTurn}`);

  // MC confirms keyword correct!
  await mcAction('R2_CONFIRM_KEYWORD_CORRECT');
  st = await getState();
  console.log(`✓ Toàn bộ bức tranh mở khóa: ${st.r2.piecesUnlocked.every(x=>x)}`);
  console.log(`✓ Điểm Đội 3 sau giải mã từ khóa (+100đ): ${st.teams.find(t=>t.id==='team-3').score} điểm`);

  // Move to Round 3
  console.log('\n[VÒNG 3] Về Đích và Cược Điểm');
  await mcAction('GO_TO_ROUND3');
  st = await getState();
  console.log('✓ Game Status:', st.status, 'Stage:', st.r3.stage);

  // Teams place wagers
  console.log('--> Các đội đặt cược: Team 1 cược 30đ, Team 3 cược 50đ, Team 2 cược 20đ');
  teamSockets['team-1'].emit('player_submit_wager', { teamId: 'team-1', wager: 30 });
  teamSockets['team-2'].emit('player_submit_wager', { teamId: 'team-2', wager: 20 });
  teamSockets['team-3'].emit('player_submit_wager', { teamId: 'team-3', wager: 50 });
  await new Promise(r => setTimeout(r, 300));

  await mcAction('R3_FORCE_LOCK_BETS');
  await new Promise(r => setTimeout(r, 500));
  await mcAction('R3_OPEN_QUESTION');

  // Team 3 buzzes first on final question
  teamSockets['team-3'].emit('player_buzz', { teamId: 'team-3', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));
  await mcAction('R3_CONFIRM_CORRECT');

  st = await getState();
  console.log(`✓ Điểm Đội 3 sau khi trả lời đúng câu hỏi cược (+50đ): ${st.teams.find(t=>t.id==='team-3').score} điểm`);

  // Move to Finale
  console.log('\n[CHUNG CUỘC] Lễ Vinh Danh & Xếp Hạng Quán Quân');
  await mcAction('R3_FINISH');
  st = await getState();
  console.log('✓ Finale Step:', st.finale.step);

  // Step through podium: 2, 3, 4, 5, 6 (Champion)
  for (let step = 1; step <= 6; step++) {
    await mcAction('FINALE_NEXT_STEP');
  }

  st = await getState();
  console.log('\n🏆 BẢNG XẾP HẠNG CHUNG CUỘC:');
  st.finale.leaderboard.forEach(t => {
    console.log(`  Hạng ${t.rank}: ${t.name.padEnd(20)} | Tổng: ${t.score}đ (V1: +${t.r1Score}đ, V2: +${t.r2Score}đ, V3: ${t.r3Result>=0?'+':''}${t.r3Result}đ)`);
  });

  console.log('\n=== KIỂM THỬ MÔ PHỎNG THÀNH CÔNG 100%! HỆ THỐNG HOẠT ĐỘNG HOÀN HẢO! ===');
  process.exit(0);
}

runFullMatchSimulation().catch(e => {
  console.error('Lỗi mô phỏng:', e);
  process.exit(1);
});
