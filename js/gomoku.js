(function() {
  const BOARD_SIZE = 15;
  const MARGIN = 32;
  const CELL_SIZE = 36;
  const STONE_RADIUS = CELL_SIZE * 0.44;
  const CANVAS_SIZE = MARGIN * 2 + CELL_SIZE * (BOARD_SIZE - 1);

  const AI_PLAYER = 2;
  const HUMAN_PLAYER = 1;

  // Difficulty config: { depth, radius, topCandidates, deepCandidates, randomness }
  const DIFFICULTY = {
    easy:   { depth: 2, radius: 1, topCandidates: 10, deepCandidates: 6,  randomness: true },
    normal: { depth: 4, radius: 2, topCandidates: 20, deepCandidates: 12, randomness: false },
    hard:   { depth: 6, radius: 2, topCandidates: 30, deepCandidates: 15, randomness: false }
  };

  var aiConfig = DIFFICULTY.normal;

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  var dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_SIZE * dpr;
  canvas.height = CANVAS_SIZE * dpr;
  canvas.style.width = CANVAS_SIZE + 'px';
  canvas.style.height = CANVAS_SIZE + 'px';
  ctx.scale(dpr, dpr);

  const turnStone = document.getElementById('turnStone');
  const turnText = document.getElementById('turnText');
  const scoreBlack = document.getElementById('scoreBlack');
  const scoreWhite = document.getElementById('scoreWhite');
  const winOverlay = document.getElementById('winOverlay');
  const winStone = document.getElementById('winStone');
  const winText = document.getElementById('winText');
  const btnUndo = document.getElementById('btnUndo');
  const btnReset = document.getElementById('btnReset');
  const historyList = document.getElementById('historyList');

  let board = [];
  let moveHistory = [];
  let currentPlayer = 1;
  let gameOver = false;
  let winLine = null;
  let wins = { 1: 0, 2: 0 };
  let hoverPos = null;
  let gameMode = 'pvp';
  let aiThinking = false;
  let difficulty = 'normal';

  const DIRECTIONS = [[0, 1], [1, 0], [1, 1], [1, -1]];

  function initBoard() {
    board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(0));
    moveHistory = [];
    currentPlayer = 1;
    gameOver = false;
    winLine = null;
    hoverPos = null;
    aiThinking = false;
    canvas.classList.remove('waiting');
    updateUI();
    updateHistory();
    drawBoard();
  }

  function updateUI() {
    if (gameOver) {
      var winner = currentPlayer === 1 ? 2 : 1;
      turnStone.className = 'turn-stone ' + (winner === 1 ? 'black-stone' : 'white-stone');
      turnText.textContent = (winner === 1 ? '黑棋' : '白棋') + ' 胜!';
    } else if (aiThinking) {
      turnStone.className = 'turn-stone white-stone thinking-pulse';
      turnText.textContent = 'AI 思考中…';
    } else {
      turnStone.className = 'turn-stone ' + (currentPlayer === 1 ? 'black-stone' : 'white-stone');
      if (gameMode === 'pvc' && currentPlayer === 2) {
        turnText.textContent = 'AI 落子';
      } else {
        turnText.textContent = currentPlayer === 1 ? '黑棋落子' : '白棋落子';
      }
    }
    scoreBlack.textContent = wins[1];
    scoreWhite.textContent = wins[2];
    canvas.classList.toggle('game-over', gameOver);
  }

  function setMode(mode) {
    gameMode = mode;
    var diffToggle = document.getElementById('difficultyToggle');
    if (mode === 'pvc') {
      diffToggle.classList.remove('hidden');
    } else {
      diffToggle.classList.add('hidden');
    }
    var btns = document.querySelectorAll('#modeToggle .seg-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].dataset.mode === mode);
    }
    initBoard();
  }

  function setDifficulty(diff) {
    difficulty = diff;
    aiConfig = DIFFICULTY[diff];
    var btns = document.querySelectorAll('#difficultyToggle .seg-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].classList.toggle('active', btns[i].dataset.diff === diff);
    }
    if (gameMode === 'pvc') initBoard();
  }

  // ── Drawing ──
  function drawBoard() {
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    var gradient = ctx.createLinearGradient(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    gradient.addColorStop(0, '#deb887');
    gradient.addColorStop(0.5, '#d2a66e');
    gradient.addColorStop(1, '#c49a5a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < BOARD_SIZE; i++) {
      var pos = MARGIN + i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(MARGIN, pos);
      ctx.lineTo(MARGIN + CELL_SIZE * (BOARD_SIZE - 1), pos);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(pos, MARGIN);
      ctx.lineTo(pos, MARGIN + CELL_SIZE * (BOARD_SIZE - 1));
      ctx.stroke();
    }

    var stars = [[3,3],[3,7],[3,11],[7,3],[7,7],[7,11],[11,3],[11,7],[11,11]];
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    for (var s of stars) {
      ctx.beginPath();
      ctx.arc(MARGIN + s[1] * CELL_SIZE, MARGIN + s[0] * CELL_SIZE, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (var li = 0; li < BOARD_SIZE; li++) {
      ctx.fillText(String.fromCharCode(65 + li), MARGIN + li * CELL_SIZE, CANVAS_SIZE - MARGIN + 6);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var li = 0; li < BOARD_SIZE; li++) {
      ctx.fillText(String(li + 1), MARGIN - 8, MARGIN + li * CELL_SIZE);
    }
    ctx.restore();

    for (let r = 0; r < BOARD_SIZE; r++)
      for (let c = 0; c < BOARD_SIZE; c++)
        if (board[r][c] !== 0) drawStone(r, c, board[r][c]);

    if (winLine) {
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.9)';
      ctx.lineWidth = 3;
      for (var w of winLine) {
        ctx.beginPath();
        ctx.arc(MARGIN + w[1] * CELL_SIZE, MARGIN + w[0] * CELL_SIZE, STONE_RADIUS + 3, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    if (moveHistory.length > 0 && !aiThinking) {
      var last = moveHistory[moveHistory.length - 1];
      ctx.fillStyle = '#ff4d4d';
      ctx.beginPath();
      ctx.arc(MARGIN + last.col * CELL_SIZE, MARGIN + last.row * CELL_SIZE, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    if (hoverPos && !gameOver && !aiThinking && board[hoverPos.row][hoverPos.col] === 0) {
      var hx = MARGIN + hoverPos.col * CELL_SIZE, hy = MARGIN + hoverPos.row * CELL_SIZE;
      ctx.fillStyle = currentPlayer === 1 ? 'rgba(0,0,0,0.25)' : 'rgba(200,200,200,0.40)';
      ctx.beginPath();
      ctx.arc(hx, hy, STONE_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawStone(row, col, player) {
    var x = MARGIN + col * CELL_SIZE, y = MARGIN + row * CELL_SIZE, r = STONE_RADIUS;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.35)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 1.5; ctx.shadowOffsetY = 1.5;
    var g;
    if (player === 1) {
      g = ctx.createRadialGradient(x - r*0.3, y - r*0.35, r*0.1, x, y, r);
      g.addColorStop(0, '#555'); g.addColorStop(0.6, '#1a1a1a'); g.addColorStop(1, '#000');
    } else {
      g = ctx.createRadialGradient(x - r*0.3, y - r*0.35, r*0.1, x, y, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#e8e8e8'); g.addColorStop(1, '#bbb');
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function getIntersection(e) {
    var rect = canvas.getBoundingClientRect();
    var scaleX = CANVAS_SIZE / rect.width, scaleY = CANVAS_SIZE / rect.height;
    var mx = (e.clientX - rect.left) * scaleX, my = (e.clientY - rect.top) * scaleY;
    var col = Math.round((mx - MARGIN) / CELL_SIZE);
    var row = Math.round((my - MARGIN) / CELL_SIZE);
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null;
    var cx = MARGIN + col * CELL_SIZE, cy = MARGIN + row * CELL_SIZE;
    if (Math.hypot(mx - cx, my - cy) > STONE_RADIUS + 2) return null;
    return { row, col };
  }

  function checkWin(row, col, player) {
    for (var d of DIRECTIONS) {
      var dr = d[0], dc = d[1];
      var line = [[row, col]];
      for (let i = 1; i < 5; i++) {
        var r = row + dr*i, c = col + dc*i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) line.push([r, c]);
        else break;
      }
      for (let i = 1; i < 5; i++) {
        var r = row - dr*i, c = col - dc*i;
        if (r >= 0 && r < BOARD_SIZE && c >= 0 && c < BOARD_SIZE && board[r][c] === player) line.unshift([r, c]);
        else break;
      }
      if (line.length >= 5) { winLine = line; return true; }
    }
    return false;
  }

  function isDraw() {
    return moveHistory.length >= BOARD_SIZE * BOARD_SIZE;
  }

  function updateHistory() {
    var list = historyList;
    if (!list) return;
    list.innerHTML = '';
    for (var i = 0; i < moveHistory.length; i++) {
      var m = moveHistory[i];
      var div = document.createElement('div');
      div.className = 'history-item';
      if (i === moveHistory.length - 1) div.classList.add('current');
      var colLabel = String.fromCharCode(65 + m.col);
      var rowLabel = String(m.row + 1);
      div.innerHTML = '<span class="history-num">' + (i + 1) + '.</span>' +
        '<span class="history-stone-sm ' + (m.player === 1 ? 'black-sm' : 'white-sm') + '"></span>' +
        '<span class="history-pos">' + colLabel + rowLabel + '</span>';
      list.appendChild(div);
    }
    list.scrollTop = list.scrollHeight;
  }

  function placeStone(row, col) {
    if (gameOver || aiThinking || board[row][col] !== 0) return;

    board[row][col] = currentPlayer;
    moveHistory.push({ row, col, player: currentPlayer });
    updateHistory();

    if (checkWin(row, col, currentPlayer)) {
      gameOver = true;
      wins[currentPlayer]++;
      updateUI();
      drawBoard();
      showWinOverlay(currentPlayer);
      return;
    }

    if (isDraw()) {
      gameOver = true;
      updateUI();
      drawBoard();
      showDrawOverlay();
      return;
    }

    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateUI();
    drawBoard();

    if (gameMode === 'pvc' && currentPlayer === AI_PLAYER && !gameOver) {
      scheduleAIMove();
    }
  }

  function scheduleAIMove() {
    aiThinking = true;
    canvas.classList.add('waiting');
    btnUndo.disabled = true;
    btnReset.disabled = true;
    updateUI();
    drawBoard();

    setTimeout(function() {
      var best = getBestMove();
      if (best) {
        board[best.row][best.col] = currentPlayer;
        moveHistory.push({ row: best.row, col: best.col, player: currentPlayer });
        updateHistory();

        if (checkWin(best.row, best.col, currentPlayer)) {
          gameOver = true;
          wins[currentPlayer]++;
          aiThinking = false;
          canvas.classList.remove('waiting');
          btnUndo.disabled = false;
          btnReset.disabled = false;
          updateUI();
          drawBoard();
          showWinOverlay(currentPlayer);
          return;
        }

        if (isDraw()) {
          gameOver = true;
          aiThinking = false;
          canvas.classList.remove('waiting');
          btnUndo.disabled = false;
          btnReset.disabled = false;
          updateUI();
          drawBoard();
          showDrawOverlay();
          return;
        }
      }

      currentPlayer = HUMAN_PLAYER;
      aiThinking = false;
      canvas.classList.remove('waiting');
      btnUndo.disabled = false;
      btnReset.disabled = false;
      updateUI();
      drawBoard();
    }, 200);
  }

  // ── AI: Evaluation ──
  var SCORE_TABLE = { 1: 1, 2: 12, 3: 150, 4: 12000, 5: 1000000 };

  function evaluateBoard() {
    var score = 0;
    for (var d of DIRECTIONS) {
      var dr = d[0], dc = d[1];
      for (var r = 0; r < BOARD_SIZE; r++) {
        for (var c = 0; c < BOARD_SIZE; c++) {
          var r4 = r + dr*4, c4 = c + dc*4;
          if (r4 < 0 || r4 >= BOARD_SIZE || c4 < 0 || c4 >= BOARD_SIZE) continue;
          var ai_cnt = 0, hum_cnt = 0;
          for (var i = 0; i < 5; i++) {
            var cell = board[r + dr*i][c + dc*i];
            if (cell === AI_PLAYER) ai_cnt++;
            else if (cell === HUMAN_PLAYER) hum_cnt++;
          }
          if (ai_cnt > 0 && hum_cnt > 0) continue;
          if (ai_cnt > 0) score += SCORE_TABLE[ai_cnt] || 0;
          if (hum_cnt > 0) score -= (SCORE_TABLE[hum_cnt] || 0) * 1.05;
        }
      }
    }
    return score;
  }

  // ── AI: Candidate moves ──
  function getCandidateMoves() {
    if (moveHistory.length === 0) return [{ row: 7, col: 7 }];

    var near = {};
    var radius = aiConfig.radius;
    for (var r = 0; r < BOARD_SIZE; r++) {
      for (var c = 0; c < BOARD_SIZE; c++) {
        if (board[r][c] === 0) continue;
        for (var dr = -radius; dr <= radius; dr++) {
          for (var dc = -radius; dc <= radius; dc++) {
            if (dr === 0 && dc === 0) continue;
            var nr = r + dr, nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && board[nr][nc] === 0) {
              near[nr * BOARD_SIZE + nc] = { row: nr, col: nc };
            }
          }
        }
      }
    }
    var candidates = Object.values(near);
    if (candidates.length === 0) candidates.push({ row: 7, col: 7 });
    return candidates;
  }

  // ── AI: Minimax ──
  function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) return evaluateBoard();

    var moves = getCandidateMoves();
    if (moves.length === 0) return 0;

    // Move ordering
    var scored = [];
    for (var m of moves) {
      board[m.row][m.col] = isMaximizing ? AI_PLAYER : HUMAN_PLAYER;
      var s = evaluateBoard();
      board[m.row][m.col] = 0;
      scored.push({ row: m.row, col: m.col, score: s });
    }

    if (isMaximizing) scored.sort(function(a, b) { return b.score - a.score; });
    else scored.sort(function(a, b) { return a.score - b.score; });

    // Prune candidates based on difficulty
    var maxBranches = depth === aiConfig.depth ? aiConfig.topCandidates : aiConfig.deepCandidates;
    if (scored.length > maxBranches) scored = scored.slice(0, maxBranches);

    if (isMaximizing) {
      var best = -Infinity;
      for (var move of scored) {
        board[move.row][move.col] = AI_PLAYER;
        if (checkWin(move.row, move.col, AI_PLAYER)) {
          board[move.row][move.col] = 0;
          return 10000000 + depth;
        }
        var val = minimax(depth - 1, alpha, beta, false);
        board[move.row][move.col] = 0;
        if (val > best) best = val;
        if (val > alpha) alpha = val;
        if (alpha >= beta) break;
      }
      return best;
    } else {
      var best = Infinity;
      for (var move of scored) {
        board[move.row][move.col] = HUMAN_PLAYER;
        if (checkWin(move.row, move.col, HUMAN_PLAYER)) {
          board[move.row][move.col] = 0;
          return -10000000 - depth;
        }
        var val = minimax(depth - 1, alpha, beta, true);
        board[move.row][move.col] = 0;
        if (val < best) best = val;
        if (val < beta) beta = val;
        if (alpha >= beta) break;
      }
      return best;
    }
  }

  function getBestMove() {
    var moves = getCandidateMoves();
    if (moves.length === 0) return { row: 7, col: 7 };
    if (moves.length === 1) return moves[0];

    // Immediate win / must-block check
    for (var m of moves) {
      board[m.row][m.col] = AI_PLAYER;
      if (checkWin(m.row, m.col, AI_PLAYER)) { board[m.row][m.col] = 0; return m; }
      board[m.row][m.col] = 0;

      board[m.row][m.col] = HUMAN_PLAYER;
      if (checkWin(m.row, m.col, HUMAN_PLAYER)) { board[m.row][m.col] = 0; return m; }
      board[m.row][m.col] = 0;
    }

    var bestScore = -Infinity;
    var bestMove = moves[0];
    var alpha = -Infinity;
    var beta = Infinity;
    var depth = aiConfig.depth;

    // Pre-score for ordering
    var preScored = [];
    for (var m of moves) {
      board[m.row][m.col] = AI_PLAYER;
      preScored.push({ row: m.row, col: m.col, score: evaluateBoard() });
      board[m.row][m.col] = 0;
    }
    preScored.sort(function(a, b) { return b.score - a.score; });
    var limit = aiConfig.topCandidates;
    if (preScored.length > limit) preScored = preScored.slice(0, limit);

    // Collect top moves for randomness (easy mode)
    var topMoves = [];
    var topThreshold = aiConfig.randomness ? 3 : 1;

    for (var move of preScored) {
      board[move.row][move.col] = AI_PLAYER;
      var val = minimax(depth - 1, alpha, beta, false);
      board[move.row][move.col] = 0;

      if (val > bestScore) {
        bestScore = val;
        bestMove = { row: move.row, col: move.col };
        topMoves = [{ row: move.row, col: move.col }];
      } else if (aiConfig.randomness && val === bestScore) {
        topMoves.push({ row: move.row, col: move.col });
      } else if (aiConfig.randomness && val >= bestScore * 0.95) {
        topMoves.push({ row: move.row, col: move.col });
      }
      if (val > alpha) alpha = val;
    }

    // In easy mode, pick randomly from top moves to add variety
    if (aiConfig.randomness && topMoves.length > 1) {
      var pick = topMoves[Math.floor(Math.random() * Math.min(topMoves.length, topThreshold))];
      return pick;
    }

    return bestMove;
  }

  // ── Game actions ──
  function showWinOverlay(winner) {
    winStone.className = 'win-stone ' + (winner === 1 ? 'black-stone' : 'white-stone');
    var name = winner === 1 ? '黑棋' : '白棋';
    if (gameMode === 'pvc') {
      name = winner === HUMAN_PLAYER ? '你' : 'AI';
    }
    winText.textContent = name + '获胜!';
    winOverlay.classList.add('visible');
  }

  function showDrawOverlay() {
    winStone.className = 'win-stone draw-stone';
    winText.textContent = '平局!';
    winOverlay.classList.add('visible');
  }

  function hideWinOverlay() {
    winOverlay.classList.remove('visible');
  }

  function undo() {
    if (gameOver || moveHistory.length === 0 || aiThinking) return;
    var count = gameMode === 'pvc' ? Math.min(2, moveHistory.length) : 1;
    for (var i = 0; i < count; i++) {
      if (moveHistory.length === 0) break;
      var move = moveHistory.pop();
      board[move.row][move.col] = 0;
    }
    currentPlayer = HUMAN_PLAYER;
    winLine = null;
    updateUI();
    updateHistory();
    drawBoard();
  }

  function resetGame() {
    hideWinOverlay();
    initBoard();
  }

  // ── Events ──
  canvas.addEventListener('click', function(e) {
    if (gameOver || aiThinking) return;
    if (gameMode === 'pvc' && currentPlayer === AI_PLAYER) return;
    var pos = getIntersection(e);
    if (pos) placeStone(pos.row, pos.col);
  });

  canvas.addEventListener('mousemove', function(e) {
    if (gameOver || aiThinking) { if (hoverPos) { hoverPos = null; drawBoard(); } return; }
    var pos = getIntersection(e);
    if (pos && board[pos.row][pos.col] === 0) {
      if (!hoverPos || hoverPos.row !== pos.row || hoverPos.col !== pos.col) {
        hoverPos = pos; drawBoard();
      }
    } else if (hoverPos) { hoverPos = null; drawBoard(); }
  });

  canvas.addEventListener('mouseleave', function() {
    if (hoverPos) { hoverPos = null; drawBoard(); }
  });

  canvas.addEventListener('touchstart', function(e) {
    if (gameOver || aiThinking) return;
    if (gameMode === 'pvc' && currentPlayer === AI_PLAYER) return;
    e.preventDefault();
    var pos = getIntersection(e.touches[0]);
    if (pos) placeStone(pos.row, pos.col);
  }, { passive: false });

  document.getElementById('btnUndo').addEventListener('click', undo);
  document.getElementById('btnReset').addEventListener('click', resetGame);
  document.getElementById('btnNewGame').addEventListener('click', resetGame);

  // Mode toggle
  var modeBtns = document.querySelectorAll('#modeToggle .seg-btn');
  for (var i = 0; i < modeBtns.length; i++) {
    modeBtns[i].addEventListener('click', function() { setMode(this.dataset.mode); });
  }

  // Difficulty toggle
  var diffBtns = document.querySelectorAll('#difficultyToggle .seg-btn');
  for (var i = 0; i < diffBtns.length; i++) {
    diffBtns[i].addEventListener('click', function() { setDifficulty(this.dataset.diff); });
  }

  document.addEventListener('keydown', function(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault(); undo();
    }
  });

  initBoard();
})();