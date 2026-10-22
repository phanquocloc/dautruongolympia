const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

async function testAutoScoring() {
  console.log('=== BẮT ĐẦU TEST TỰ ĐỘNG CHẤM & CỘNG/TRỪ ĐIỂM (KHÔNG CẦN MC ẤN THỦ CÔNG) ===');

  const mcSocket = io(SERVER_URL);
  const teamSockets = {};
  const teams = ['team-1', 'team-2', 'team-3', 'team-4', 'team-5'];

  for (const tid of teams) {
    const s = io(SERVER_URL);
    teamSockets[tid] = s;
    s.emit('team_join', { teamId: tid, roomCode: 'ARENA88' });
  }

  await new Promise(r => setTimeout(r, 600));

  const mcAction = (action, payload = {}) => {
    return new Promise(resolve => {
      mcSocket.emit('mc_action', { action, payload });
      setTimeout(resolve, 300);
    });
  };

  const getState = async () => {
    const res = await fetch(`${SERVER_URL}/api/state`);
    return await res.json();
  };

  // -------------------------------------------------------------
  // TEST 1: VÒNG 1 - TỰ ĐỘNG CỘNG ĐIỂM KHI ĐÚNG
  // -------------------------------------------------------------
  console.log('\n--- 1. TEST VÒNG 1: TỰ ĐỘNG CỘNG ĐIỂM KHI CHỌN ĐÚNG ---');
  await mcAction('START_GAME');
  await mcAction('R1_OPEN_QUESTION', { index: 0 });
  await mcAction('R1_START_BUZZER');

  // Đội 1 bấm chuông
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  let st = await getState();
  console.log(`Đội 1 giành quyền trả lời câu 1. Stage: ${st.r1.stage}`);

  // Đội 1 chọn đáp án B (index 1 - đúng) KHÔNG CÓ BẤT KỲ LỆNH MC CONFIRM NÀO
  console.log('-> Đội 1 bấm chọn đáp án [B] (ĐÚNG)...');
  teamSockets['team-1'].emit('player_select_answer', { teamId: 'team-1', answerIndex: 1 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  const t1 = st.teams.find(t => t.id === 'team-1');
  console.log(`Kết quả: Điểm Đội 1 = ${t1.score} (Kỳ vọng: 30) | Stage = ${st.r1.stage} (Kỳ vọng: REVEALED)`);
  if (t1.score === 30 && st.r1.stage === 'REVEALED') {
    console.log('✓ PASS TEST 1: Tự động cộng +30đ vòng 1 thành công!');
  } else {
    throw new Error('FAIL TEST 1: Tự động cộng điểm Vòng 1 thất bại');
  }

  // -------------------------------------------------------------
  // TEST 2: VÒNG 1 - CHỌN SAI TỰ ĐỘNG CHUYỂN LƯỢT & ĐỘI SAU CỘNG +20Đ
  // -------------------------------------------------------------
  console.log('\n--- 2. TEST VÒNG 1: CHỌN SAI TỰ ĐỘNG CHUYỂN LƯỢT ---');
  await mcAction('R1_OPEN_QUESTION', { index: 1 });
  await mcAction('R1_START_BUZZER');

  // Đội 1 bấm trước, Đội 2 bấm sau
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 20));
  teamSockets['team-2'].emit('player_buzz', { teamId: 'team-2', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  // Đội 1 chọn sai (index 0, đáp án đúng là 2)
  console.log('-> Đội 1 bấm chọn đáp án [A] (SAI)...');
  teamSockets['team-1'].emit('player_select_answer', { teamId: 'team-1', answerIndex: 0 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  console.log(`Sau khi Đội 1 sai: Quyền chuyển cho ${st.r1.currentTurn} (Kỳ vọng: team-2), Attempt: ${st.r1.activeAttempt}`);

  // Đội 2 chọn đúng (index 2)
  console.log('-> Đội 2 bấm chọn đáp án [C] (ĐÚNG)...');
  teamSockets['team-2'].emit('player_select_answer', { teamId: 'team-2', answerIndex: 2 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  const t2 = st.teams.find(t => t.id === 'team-2');
  console.log(`Kết quả: Điểm Đội 2 = ${t2.score} (Kỳ vọng: 20đ vì là lượt 2) | Stage = ${st.r1.stage}`);
  if (t2.score === 20 && st.r1.stage === 'REVEALED') {
    console.log('✓ PASS TEST 2: Chọn sai tự động chuyển quyền, đội sau chọn đúng tự động nhận +20đ!');
  } else {
    throw new Error('FAIL TEST 2: Xử lý sai và chuyển quyền thất bại');
  }

  // -------------------------------------------------------------
  // TEST 3: VÒNG 2 - TỰ ĐỘNG MỞ MẢNH GHÉP VÀ CỘNG ĐIỂM
  // -------------------------------------------------------------
  console.log('\n--- 3. TEST VÒNG 2: TỰ ĐỘNG MỞ MẢNH GHÉP & CỘNG ĐIỂM ---');
  await mcAction('GO_TO_ROUND2');
  await mcAction('R2_SELECT_PIECE', { pieceIndex: 0 });
  await mcAction('R2_START_PIECE_BUZZER');

  teamSockets['team-3'].emit('player_buzz', { teamId: 'team-3', buzzerType: 'PIECE' });
  await new Promise(r => setTimeout(r, 300));

  // Đội 3 chọn đáp án B (index 1 - đúng)
  console.log('-> Đội 3 bấm chọn đáp án [B] cho Mảnh ghép 1 (ĐÚNG)...');
  teamSockets['team-3'].emit('player_select_answer', { teamId: 'team-3', answerIndex: 1 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  const t3 = st.teams.find(t => t.id === 'team-3');
  console.log(`Kết quả: Điểm Đội 3 = ${t3.score} (Kỳ vọng: 20) | Mảnh 1 mở: ${st.r2.piecesUnlocked[0]} | Stage: ${st.r2.stage}`);
  if (t3.score === 20 && st.r2.piecesUnlocked[0] === true && st.r2.stage === 'PIECE_REVEALED') {
    console.log('✓ PASS TEST 3: Vòng 2 tự động mở mảnh ghép và cộng điểm thành công!');
  } else {
    throw new Error('FAIL TEST 3: Tự động mở mảnh ghép Vòng 2 thất bại');
  }

  // -------------------------------------------------------------
  // TEST 4: VÒNG 3 - TỰ ĐỘNG TRỪ ĐIỂM CƯỢC KHI SAI & CỘNG ĐIỂM CƯỢC KHI ĐÚNG
  // -------------------------------------------------------------
  console.log('\n--- 4. TEST VÒNG 3: TỰ ĐỘNG CỘNG / TRỪ ĐIỂM CƯỢC ---');
  await mcAction('GO_TO_ROUND3');

  // Đặt cược: Đội 1 cược 30đ (đang có 30đ), Đội 2 cược 20đ (đang có 20đ)
  teamSockets['team-1'].emit('player_submit_wager', { teamId: 'team-1', wager: 30 });
  teamSockets['team-2'].emit('player_submit_wager', { teamId: 'team-2', wager: 20 });
  await new Promise(r => setTimeout(r, 300));
  await mcAction('R3_FORCE_LOCK_BETS');
  await new Promise(r => setTimeout(r, 400));
  await mcAction('R3_OPEN_QUESTION');

  // Cả Đội 1 và Đội 2 bấm chuông
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 20));
  teamSockets['team-2'].emit('player_buzz', { teamId: 'team-2', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  // Đội 1 trả lời SAI (index 0, đúng là index 1)
  console.log('-> Đội 1 cược 30đ bấm chọn đáp án [A] (SAI)...');
  teamSockets['team-1'].emit('player_select_answer', { teamId: 'team-1', answerIndex: 0 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  const t1_after = st.teams.find(t => t.id === 'team-1');
  console.log(`Kết quả Đội 1 sau khi SAI: Điểm = ${t1_after.score} (Kỳ vọng: 0đ vì 30 - 30) | Quyền chuyển cho: ${st.r3.currentTurn}`);
  if (t1_after.score !== 0 || st.r3.currentTurn !== 'team-2') {
    throw new Error('FAIL TEST 4: Trừ điểm cược hoặc chuyển quyền Vòng 3 thất bại');
  }

  // Đội 2 trả lời ĐÚNG (index 1)
  console.log('-> Đội 2 cược 20đ bấm chọn đáp án [B] (ĐÚNG)...');
  teamSockets['team-2'].emit('player_select_answer', { teamId: 'team-2', answerIndex: 1 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  const t2_after = st.teams.find(t => t.id === 'team-2');
  console.log(`Kết quả Đội 2 sau khi ĐÚNG: Điểm = ${t2_after.score} (Kỳ vọng: 40đ vì 20 + 20) | Stage = ${st.r3.stage}`);
  if (t2_after.score === 40 && st.r3.stage === 'REVEALED') {
    console.log('✓ PASS TEST 4: Vòng 3 tự động trừ điểm cược khi sai và tự động cộng trọn vẹn điểm cược khi đúng!');
  } else {
    throw new Error('FAIL TEST 4: Cộng điểm cược Vòng 3 thất bại');
  }

  // -------------------------------------------------------------
  // TEST 5: VÒNG 3 - ĐỘI ĐÃ SAI KHÔNG ĐƯỢC BẤM CHUÔNG LẠI, CHỈ CÁC ĐỘI CÒN LẠI ĐƯỢC BẤM
  // -------------------------------------------------------------
  console.log('\n--- 5. TEST VÒNG 3: ĐỘI ĐÃ TRẢ LỜI SAI BỊ CẤM BẤM LẠI, CHỈ ĐỘI CÒN LẠI ĐƯỢC BẤM ---');
  await mcAction('GO_TO_ROUND3');
  teamSockets['team-1'].emit('player_submit_wager', { teamId: 'team-1', wager: 10 });
  teamSockets['team-2'].emit('player_submit_wager', { teamId: 'team-2', wager: 10 });
  teamSockets['team-3'].emit('player_submit_wager', { teamId: 'team-3', wager: 10 });
  await new Promise(r => setTimeout(r, 200));
  await mcAction('R3_FORCE_LOCK_BETS');
  await new Promise(r => setTimeout(r, 300));
  await mcAction('R3_OPEN_QUESTION');

  // Chỉ một mình Đội 1 bấm chuông trước
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));
  st = await getState();
  console.log(`Đội 1 giành quyền trả lời. Current Turn: ${st.r3.currentTurn}`);

  // Đội 1 trả lời SAI
  console.log('-> Đội 1 chọn đáp án [A] (SAI)...');
  teamSockets['team-1'].emit('player_select_answer', { teamId: 'team-1', answerIndex: 0 });
  await new Promise(r => setTimeout(r, 400));

  st = await getState();
  console.log(`Sau khi Đội 1 trả lời sai: Stage = ${st.r3.stage} | Đội 1 locked = ${st.teams.find(t=>t.id==='team-1').locked} | wrongTeams = ${JSON.stringify(st.r3.wrongTeams)}`);

  // Đội 1 CỐ TÌNH BẤM CHUÔNG LẠI
  console.log('-> Đội 1 (đã sai) cố tình bấm chuông lại...');
  teamSockets['team-1'].emit('player_buzz', { teamId: 'team-1', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  st = await getState();
  console.log(`Kết quả: Current Turn = ${st.r3.currentTurn} (Kỳ vọng: null vì Đội 1 bị cấm bấm!)`);
  if (st.r3.currentTurn === 'team-1') {
    throw new Error('FAIL TEST 5: Đội đã trả lời sai vẫn bấm chuông được!');
  }

  // MC bấm "Mở lại chuông cho các đội còn lại" (hoặc chuông tự động mở)
  await mcAction('R3_REOPEN_BUZZER');
  st = await getState();
  console.log(`Sau khi mở lại chuông: Đội 1 locked = ${st.teams.find(t=>t.id==='team-1').locked} (vẫn phải true)`);
  if (!st.teams.find(t=>t.id==='team-1').locked) {
    throw new Error('FAIL TEST 5: Đội 1 bị mở khóa trái phép khi mở lại chuông!');
  }

  // Đội 3 (đội chưa trả lời) bấm chuông
  console.log('-> Đội 3 (chưa trả lời sai) bấm chuông...');
  teamSockets['team-3'].emit('player_buzz', { teamId: 'team-3', buzzerType: 'NORMAL' });
  await new Promise(r => setTimeout(r, 300));

  st = await getState();
  console.log(`Kết quả: Current Turn = ${st.r3.currentTurn} (Kỳ vọng: team-3)`);
  if (st.r3.currentTurn !== 'team-3') {
    throw new Error('FAIL TEST 5: Đội 3 chưa sai không bấm chuông được!');
  }

  console.log('✓ PASS TEST 5: Đội trả lời sai bị cấm bấm lại hoàn toàn, chỉ các đội còn lại mới được bấm!');

  console.log('\n=============================================================');
  console.log('🎉 TẤT CẢ 5 TEST KIỂM THỬ ĐỀU THÀNH CÔNG TUYỆT ĐỐI 100%!');
  console.log('=============================================================');

  process.exit(0);
}

testAutoScoring().catch(e => {
  console.error('Lỗi kiểm thử:', e);
  process.exit(1);
});
