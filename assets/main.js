// Đặt chung một nơi để đổi cho dễ
const API_CHECK  = (location.hostname.match(/localhost|127\.0\.0\.1/))
  ? "http://127.0.0.1:5583/api/check"
  : `https://fastapi-backend-yda2.onrender.com/api/check`;

const API_WEAK100  = (location.hostname.match(/localhost|127\.0\.0\.1/))
  ? "http://127.0.0.1:5583/api/weak100"
  : `https://fastapi-backend-yda2.onrender.com/api/weak100`;
const API_WEAK100_RANDOMLIST  = (location.hostname.match(/localhost|127\.0\.0\.1/))
  ? "http://127.0.0.1:5583/api/weak100/randomlist"
  : `https://fastapi-backend-yda2.onrender.com/api/weak100/randomlist`;
const smallWordlist = [
  "@pplE", "C10ud", "r1vEr", "st0n3", "gr33n", "b1u3", "st@r", "m00n",
  "l1ght", "tr33", "w01f", "f0x", "l1On", "k1n8", "qu33n", "sUn",
  "r@1n", "w1nd", "f1r3", "sn0w", "l3@f", "sKy", "b1rd", "f1sh",
  "tu@n","n@m", "h@i", "b@ch", "d1en", "t1en", "th@nh", "phu0ng",
  "th1nh","ho@ng", "qu@ng", "n@ng", "v1et", "c0m", "g@o", "b@nh", "m1nH",
];

function extractYears(text){
  if(!text) return 0;
  const m = String(text).match(/([0-9]*\.?[0-9]+)/);
  return m ? parseFloat(m[1]) : 0;
}

  //Render Metrics
  function renderMetrics(d) {
  const wrap = document.getElementById("metrics");
  if (!wrap) return; // Nếu không có element thì không làm gì cả
  wrap.style.display = "grid";
  wrap.innerHTML = ""; // clear cũ

  const add = (title, value, subHtml="") => {
    const card = document.createElement("div");
    card.className = "metric-card";
    card.innerHTML = `
      <div class="metric-title">${title}</div>
      <div class="metric-value">${value}</div>
      ${subHtml ? `<div class="metric-sub">${subHtml}</div>` : ""}
    `;
    wrap.appendChild(card);
  };

// 1) Điểm
add("Score (0–100)",
  `<span class="metric-value"><span class="score-dot score-${d.score}"></span>${d.score}</span>`,
  d.risk_level || "-"
);


  // 2) Số lần đoán
  add("The number of guesses that can occur:", formatLarge(d.guesses || 0));

  // 3) Rò rỉ (HIBP)
  let pwnedVal = "";
  if (d.pwned === null) {
    pwnedVal = `<span class="muted">Không tra được</span>`;
  } else if (d.pwned) {
    pwnedVal = `<span class="pwn-badge pwn-danger">LEAKED</span>`;
  } else {
    pwnedVal = `<span class="pwn-badge pwn-ok">NOT LEAKED</span>`;
  }
let pwnedSub = (d.pwned && d.pwned_count)
  ? `NUMBER OF APPEARANCES: ${formatLarge(d.pwned_count)}`
  : "Not found in HIBP";
add("Leak status (HIBP)", pwnedVal, pwnedSub);


  // 4) Mức rủi ro AI
  add("Password strength assesment (by AI)", d.risk_level || "undefined");

  // 5) Kiểu tấn công có thể
  add("attack type", d.attack_vector || "undefined");

  // 6) Thời gian dò 
  add("Break Time Estimates",
      `<div><strong>Mobile Phone CPU</strong>: ${d.crack_time?.mobile || "—"}</div>
       <div><strong>Desktop GPU</strong>: ${d.crack_time?.desktop || "—"}</div>
       <div><strong>Cloud Computing</strong>: ${d.crack_time?.cloud || "—"}</div>`);

  // 7) Thời gian dò (giây, số thô – cho phân tích)
//Bỏ qua mục này để giao diện gọn hơn
  // 8) Gợi ý
const escapeHTML = (str) =>
    String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  const hasSug = Array.isArray(d.suggestions) && d.suggestions.length > 0;
  const sugHtml = hasSug
      ? d.suggestions.map(s => `• ${escapeHTML(s)}`).join("<br>")
      : "Good password, nothing to suggest.";
  const warnHtml = d.warning ? `<br><strong style="color: red;">${escapeHTML(d.warning)}</strong>` : "";

  add("Gợi ý cải thiện", sugHtml + warnHtml);

}

// helpers
async function sha1Hex(input) {
  const enc = new TextEncoder();
  const data = enc.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2,'0')).join('').toUpperCase();
}

function formatLarge(n){
  if(n===Infinity) return '∞';
  if(n<1000) return n.toFixed(0);
  const units=['','K','M','B','T']; let u=0; while(n>=1000 && u<units.length-1){n/=1000;u++;}
  return n.toFixed(2)+units[u];
}

function formatTime(seconds){
  if(seconds===Infinity) return '∞';
  const year = 60*60*24*365;
  if(seconds>=year) return (seconds/year).toFixed(2)+' years';
  if(seconds>=86400) return (seconds/86400).toFixed(2)+' days';
  if(seconds>=3600) return (seconds/3600).toFixed(2)+' hours';
  if(seconds>=60) return (seconds/60).toFixed(2)+' minutes';
  return seconds.toFixed(2)+' seconds';
}



function estimateCrackTime(guesses, gps){
  if(!isFinite(guesses) || guesses<=0) return Infinity;
  return guesses / gps;
}

// main
const pwInput = document.getElementById('pw');
const checkBtn = document.getElementById('checkBtn');
const genBtn = document.getElementById('genBtn');
const resultDiv = document.getElementById('result');

// Chỉ gán sự kiện nếu các phần tử tồn tại
if (pwInput && checkBtn && genBtn && resultDiv) {
  checkBtn.onclick = async () => {
    const pw = pwInput.value || "";
    if (!pw) {
      alert("Enter a password to check.Don't use your real password!");
      return;
    }

    try {
      const resp = await fetch(API_CHECK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pw }),
      });
      const data = await resp.json();

      resultDiv.style.display = "block";
      renderMetrics(data); // giữ nguyên render thẻ
      updateScoreBar(data.score, data.risk_level); // Thêm dòng này
      document.getElementById('guessesValue').textContent = formatLarge(data.guesses);
      updateHibpStatus(data.pwned, data.pwned_count); // <-- Thêm dòng này để cập nhật trạng thái HIBP
      updateAttackType(data.attack_vector);
      updateCrackTimeBars(data.crack_time);
      updateSuggestions(data.suggestions, data.warning);
      document.getElementById('toggleResultBtn').style.display = "flex";
    } catch (e) {
      console.error(e);
      alert("Cannot connect to backend! Please check if FastAPI server is running.");
    }
  };

  pwInput.addEventListener('keydown', function(e) {
    if (e.key === "Enter") {
      checkBtn.click();
    }
  });
  genBtn.onclick = () => {
    const parts = [];
    for(let i=0;i<4;i++) parts.push(smallWordlist[Math.floor(Math.random()*smallWordlist.length)]);
    const pass = parts.join('-');
    pwInput.value = pass;
    checkBtn.click();
  };
}

// Wordlist batch processing (client-side; small lists only)
const checkListBtn = document.getElementById('checkListBtn');
if (checkListBtn) {
  checkListBtn.onclick = async ()=>{
  const raw = document.getElementById('wordlist').value.trim();
  if(!raw){alert('Paste some passwords (small lists).');return}
  const lines = raw.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const outDiv = document.getElementById('wordlistResult');
  outDiv.innerHTML = '<p class="muted">Processing '+lines.length+' items (client-side). Please wait...</p>';
  const rows = [];
  for(const pw of lines){
    const z = zxcvbn(pw);
    rows.push({ pw, score: z.score, guesses: z.guesses || 0, pwned: "-" });
  }
  // render table
  let html = '<table style="width:100%;border-collapse:collapse">';
  html += '<tr><th>Password</th><th>Score</th><th>Guesses(est)</th><th>Pwned</th></tr>';
  for(const r of rows){
    html += `<tr><td><code>${escapeHtml(r.pw)}</code></td><td>${r.score}</td><td>${formatLarge(r.guesses)}</td><td>${r.pwned}</td></tr>`;
  }
  html += '</table>';
  outDiv.innerHTML = html;
}
}

function escapeHtml(str){return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}


document.addEventListener('DOMContentLoaded', function() {
  // Lấy các phần tử DOM sau khi đã render xong HTML
  const weakList  = document.getElementById("weak-list");
  const weakStamp = document.getElementById("weakStamp");
  const weakLeader = document.getElementById("weak-leader");
  const refreshBtn = document.getElementById("refreshWeak");

  // Hàm format số
  function fmt(n){ return new Intl.NumberFormat('vi', {notation:'compact', maximumFractionDigits:1}).format(n||0); }

  // Hàm load dữ liệu
  async function loadWeak100(api = API_WEAK100){
    try{
      const r = await fetch(api, { cache:'no-store' });
      if(!r.ok) throw new Error("HTTP "+r.status);
      const data = await r.json();

      weakStamp.textContent = data.generated_at ? "Lastest update: " + new Date(data.generated_at).toLocaleString() : "";

      const items = (data.items||[]).slice(0,100);

      // Leader (top 1)
      if(items.length){
        const leader = items[0];
        weakLeader.style.display = "";
        weakLeader.innerHTML = `
          <div class="leader-card leader-row">
            <div class="title">Most common password</div>
            <div class="pw">${leader.password}</div>
            <div class="meta">Number of resource: ${leader.sources.length}</div>
            <div class="meta">Number of appearance: ${leader.count}</div>
          </div>
        `;
      } else {
        weakLeader.style.display = "none";
        weakLeader.innerHTML = "";
      }

      // List (top 100)
      weakList.innerHTML = `
        <table class="weak-table">
          <thead>
            <tr>
              <th style="width:100px">No.</th>
              <th style="text-align:right">Password</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td class="rank">#${idx+1}</td>
                <td class="pw">${item.password}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    }catch(e){
      weakLeader.style.display = "none";
      weakList.innerHTML = '<div class="muted">Can not load weak passwords data.</div>';
      weakStamp.textContent = "";
      console.error(e);
    }
  }

  // Gán sự kiện cho nút refresh
if (refreshBtn) {
  refreshBtn.onclick = async function(e) {
    e.preventDefault();
    try {
      // 1. Gọi API randomlist để lấy 100 mật khẩu random
      const r = await fetch(API_WEAK100_RANDOMLIST, { cache: 'no-store' });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const data = await r.json();

      // 2. Cập nhật leader card (lấy phần tử đầu tiên của danh sách random)
      const items = (data.items || []);
      if(items.length){
        const leader = items[0];
        weakLeader.style.display = "";
        weakLeader.innerHTML = `
          <div class="leader-card leader-row">
            <div class="title">Weak password reference</div>
            <div class="pw">${leader.password}</div>
            <div class="meta">Number of resource: ${leader.sources.length}</div>
            <div class="meta">Number of appearance: ${leader.count}</div>
          </div>
        `;
      } else {
        weakLeader.style.display = "none";
        weakLeader.innerHTML = "";
      }

      // 3. Cập nhật bảng danh sách random
      weakStamp.textContent = data.generated_at
        ? "Lastest update: " + new Date(data.generated_at).toLocaleString()
        : "Randomized list";

      weakList.innerHTML = `
        <table class="weak-table">
          <thead>
            <tr>
              <th style="width:100px">No.</th>
              <th style="text-align:right">Password</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item, idx) => `
              <tr>
                <td class="rank">#${idx+1}</td>
                <td class="pw">${item.password}</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      `;
    } catch (e) {
      weakLeader.style.display = "none";
      weakList.innerHTML = '<div class="muted">Can not load weak passwords data.</div>';
      weakStamp.textContent = "";
      console.error(e);
    }
  };
}
  // Tải dữ liệu lần đầu
  loadWeak100();

  // Tự động reload mỗi 30s
  setInterval(loadWeak100, 30000);
});

function updateScoreBar(score, riskLevel) {
  const bar = document.getElementById('scoreBar');
  const label = document.getElementById('scoreBarLabel');
  if (!bar || !label) return;

  // Xác định màu theo mức độ
  let color = "#dc2626"; // Critical
  if (score <= 10) color = "#dc2626";         // Critical (đỏ)
  else if (score <= 19) color = "#f97316";    // High (cam)
  else if (score <= 39) color = "#eab308";    // Weak (vàng)
  else if (score <= 59) color = "#facc15";    // Medium (vàng nhạt)
  else if (score <= 79) color = "#22c55e";    // Strong (xanh lá)
  else color = "#10b981";                     // Very Strong (xanh ngọc)

  bar.style.width = `${Math.max(5, score)}%`; // Đảm bảo luôn có thanh nhỏ nếu điểm thấp
  bar.style.background = color;
  label.textContent = `${score}/100 — ${riskLevel}`;
}

document.addEventListener('DOMContentLoaded', function() {
  // ...các code khác...

  // Xử lý nút ẩn/hiện mật khẩu
  const pwInput = document.getElementById('pw');
  const togglePw = document.getElementById('togglePw');
  if (pwInput && togglePw) {
    togglePw.addEventListener('click', function() {
      if (pwInput.type === "password") {
        pwInput.type = "text";
        togglePw.innerText = "⌣";
      } else {
        pwInput.type = "password";
        togglePw.innerText = "👁";
      }
    });
  }

  // Xử lý nút dán mật khẩu
 const pastePw = document.getElementById('pastePw');
if (pwInput && pastePw) {
  pastePw.title = "Copy"; // Đổi tooltip
  pastePw.innerText = "🗒"; // (giữ nguyên icon hoặc đổi thành 📝 nếu muốn)
  pastePw.addEventListener('click', async function() {
    try {
      await navigator.clipboard.writeText(pwInput.value);
      pastePw.innerText = "✓";
      setTimeout(() => pastePw.innerText = "🗒", 1200);
    } catch (e) {
      alert("Can not copy to clipboard.");
    }
  });
}
});

function updateHibpStatus(pwned, pwned_count) {
  const status = document.getElementById('hibpStatus');
  const count = document.getElementById('hibpCount');
  if (!status || !count) return;

  if (pwned === null) {
    status.textContent = "UNKNOWN";
    status.className = "pwn-badge";
    count.textContent = "";
  } else if (pwned) {
    status.textContent = "LEAKED";
    status.className = "pwn-badge pwn-danger";
    count.textContent = (pwned_count && pwned_count > 0)
      ? `NUMBER OF APPEARANCES: ${formatLarge(pwned_count)}`
      : "";
  } else {
    status.textContent = "NOT LEAKED";
    status.className = "pwn-badge pwn-ok";
    count.textContent = "";
  }
}
function updateAttackType(attackType) {
  const el = document.getElementById('attackType');
  if (!el) return;
  el.textContent = attackType || "Unknown";
}
function updateCrackTimeBars(crackTimeObj) {
  // Định nghĩa các mức max (giả định: 100 năm là max)
  const maxSeconds = 100 * 365 * 24 * 3600; // 100 năm
  const devices = [
    { key: "mobile", fill: "crackFillMobile", val: "crackValMobile" },
    { key: "desktop", fill: "crackFillDesktop", val: "crackValDesktop" },
    { key: "cloud", fill: "crackFillCloud", val: "crackValCloud" }
  ];
  devices.forEach(dev => {
    const fill = document.getElementById(dev.fill);
    const val = document.getElementById(dev.val);
    let seconds = 0;
    let label = crackTimeObj?.[dev.key] || "—";
    // Ước lượng số giây từ label
    if (label && typeof label === "string" && label !== "—") {
      if (label.includes("year")) seconds = parseFloat(label) * 365 * 24 * 3600;
      else if (label.includes("day")) seconds = parseFloat(label) * 24 * 3600;
      else if (label.includes("hour")) seconds = parseFloat(label) * 3600;
      else if (label.includes("minute")) seconds = parseFloat(label) * 60;
      else if (label.includes("second")) seconds = parseFloat(label);
      else if (label.includes("∞")) seconds = maxSeconds;
    }
    // Tính phần trăm chiều dài cột
    let percent = Math.max(5, Math.min(100, (seconds / maxSeconds) * 100));
    fill && (fill.style.width = percent + "%");
    // Đổi màu theo mức độ
    let color = "#f87171"; // đỏ
    if (percent > 80) color = "#22c55e"; // xanh lá
    else if (percent > 60) color = "#a3e635"; // xanh nhạt
    else if (percent > 40) color = "#facc15"; // vàng
    else if (percent > 20) color = "#f97316"; // cam
    fill && (fill.style.background = color);
    val && (val.textContent = label);
  });
}
function updateSuggestions(suggestions, warning) {
  const list = document.getElementById('suggestionList');
  if (!list) return;
  list.innerHTML = "";
  if (Array.isArray(suggestions) && suggestions.length > 0) {
    suggestions.forEach(s => {
      const li = document.createElement('li');
      li.textContent = s;
      list.appendChild(li);
    });
  } else {
    const li = document.createElement('li');
    li.textContent = "Good password, nothing to suggest.";
    li.className = "strong";
    list.appendChild(li);
  }
  if (warning) {
    const li = document.createElement('li');
    li.textContent = warning;
    li.className = "warning";
    list.appendChild(li);
  }
}
document.addEventListener('DOMContentLoaded', function() {
  const toggleBtn = document.getElementById('toggleResultBtn');
  const resultDiv = document.getElementById('result');
  if (toggleBtn && resultDiv) {
    toggleBtn.addEventListener('click', function() {
      const isOpen = toggleBtn.getAttribute('aria-expanded') === "true";
      toggleBtn.setAttribute('aria-expanded', !isOpen);
      resultDiv.style.display = isOpen ? "none" : "block";
    });
  }
});

function animateBlurText(text, delay = 120) {
  const el = document.getElementById('blurText');
  if (!el) return;
  el.innerHTML = '';
  // Tách cả từ và khoảng trắng
  const parts = text.split(/(\s+)/); // giữ cả khoảng trắng
  parts.forEach((part, i) => {
    const span = document.createElement('span');
    span.textContent = part;
    el.appendChild(span);
    setTimeout(() => {
      span.classList.add('visible');
    }, delay * i);
  });
}

// Ví dụ sử dụng:
animateBlurText("Enter your password here", 150);

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}


 const canvas = document.getElementById("canvas");
  const gl = canvas.getContext("webgl");
  const img = document.getElementById("sourceImage");

  // 캔버스 크기 설정
  const setCanvasSize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  setCanvasSize();

  // 셰이더 생성
  const vsSource = `
        attribute vec2 position;
        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `;

  const fsSource = document.getElementById("fragShader").textContent;

  const createShader = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  // 프로그램 생성
  const vs = createShader(gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.useProgram(program);

  // 버퍼 설정
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  // 유니폼 위치
  const uniforms = {
    resolution: gl.getUniformLocation(program, "iResolution"),
    time: gl.getUniformLocation(program, "iTime"),
    mouse: gl.getUniformLocation(program, "iMouse"),
    texture: gl.getUniformLocation(program, "iChannel0"),
  };

  // 마우스 추적
  let mouse = [0, 0];
  canvas.addEventListener("mousemove", (e) => {
    mouse = [e.clientX, canvas.height - e.clientY];
  });

  // 텍스처 설정
  const texture = gl.createTexture();
  const setupTexture = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      img
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  if (img.complete) {
    setupTexture();
  } else {
    img.onload = setupTexture;
  }

  // 렌더링
  const startTime = performance.now();
  const render = () => {
    const currentTime = (performance.now() - startTime) / 1000;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform3f(uniforms.resolution, canvas.width, canvas.height, 1.0);
    gl.uniform1f(uniforms.time, currentTime);
    gl.uniform4f(uniforms.mouse, mouse[0], mouse[1], 0, 0);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(uniforms.texture, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
  };

  // 리사이즈 이벤트
  window.addEventListener("resize", setCanvasSize);

  render();