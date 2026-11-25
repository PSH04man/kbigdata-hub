// '맞혔어요' 클릭을 잡아서 이름을 정하고 background 로 넘긴다
const SKIP = "답만 적는 유형이라 GitHub에 올리지 않았어요. 실기는 SQL 작성 문제만 올려요.";
const CHANGED = "포털 화면이 바뀌어서 문제 정보를 못 찾았어요. 확장프로그램 업데이트가 필요해요.";
const STALE = "확장프로그램이 새로고침(업데이트)됐어요. 이 페이지를 새로고침한 뒤 다시 해 주세요.";
const BAD_NAME = "이름에는 글자·숫자·_ 만 쓸 수 있고 숫자로 시작할 수 없어요.";
const stale = () => !chrome.runtime?.id && (card.show({ head: "새로고침이 필요해요", text: STALE, tone: "err" }), true); // 확장이 갈리면 옛 탭은 먹통
const practical = () => location.pathname?.endsWith("/practical.html");
document.addEventListener("click", e => handle(practical() ? sqlAnswer(e) : codingAnswer(e)), true);

function handle(found) {
  if (!found || stale()) return;
  if (found.skip) return card.show({ text: SKIP });
  if (found.broken) return card.show({ head: "올릴 수 없어요", text: CHANGED, tone: "err" });
  if (!found.code.trim()) return card.show({ text: "작성한 답이 없어서 올리지 않았어요." });
  solved(found);
}

// 실기: 직접 쓰는 SQL 작성 문제만 올림 (rows=7 이 SQL 작성 유형). 다른 유형은 안 올린다고 알려 줌
function sqlAnswer(e) {
  if (e.target.closest?.('.study-review [data-grade="correct"]')) return readSql();
}

function readSql() {
  const answer = document.querySelector("#my-answer");
  if (answer && !answer.matches('textarea[rows="7"]')) return { skip: true };
  const id = new URL(location.href).searchParams.get("id");
  if (!answer || !id) return;
  return { id, title: document.querySelector("#solve-title")?.textContent.trim() || id, code: answer.value, ext: "sql" };
}

// 350제. 포털이 요소 이름을 바꿔도 견디게 예비 단서를 둠: 버튼 글자, 주소의 ?id=, 포털이 저장한 임시 답안
function codingAnswer(e) {
  const button = e.target.closest?.('[data-grade="correct"], button, a, [role=button]');
  if (button && (button.dataset.grade === "correct" || button.textContent.trim() === "맞혔어요")) return readCoding();
}

function readCoding() {
  const text = s => document.querySelector(s)?.textContent.trim();
  // 주소는 누구나 만들 수 있으니 포털의 문제 번호 모양일 때만 씀 (GitHub 경로에 들어감)
  const fromUrl = new URL(location.href).searchParams.get("id");
  const id = text("#coding-id") || (/^[A-Za-z0-9_-]{1,90}$/.test(fromUrl) ? fromUrl : null);
  const shown = document.querySelector("#coding-editor")?.value;
  const code = shown ?? (id && localStorage.getItem("kbigdata:coding:draft:v1:" + id));
  if (!id || (shown === undefined && !code)) return { broken: true };
  return { id, title: text("#coding-title") || id, code, draft: shown === undefined, ext: KB.lang(id).ext, problem: readProblem() };
}

// 맞힌 기록이 있으면 '맞혔어요'를 다시 누르지 않고 올리는 버튼을 둠 (포털 풀이 기록은 건드리지 않음)
function syncUploadButton() {
  for (const review of document.querySelectorAll(".study-review")) {
    const box = review.parentElement;
    let mine = box.querySelector(":scope > kb-hub-upload");
    const show = review.querySelector('[data-grade="correct"][aria-pressed="true"]')
      && (!practical() || document.querySelector('textarea#my-answer[rows="7"]'));
    if (!show) mine?.remove();
    else if (!mine) box.append(mine = uploadButton());
    // 350제의 '다시 풀기'는 꾸밈이 없어 모양만 입힘 (동작은 포털 것). 실기는 포털 디자인이 있어 둠
    const retry = !practical() && [...box.querySelectorAll(":scope > button")].find(b => b.textContent.trim() === "다시 풀기");
    const pair = Boolean(retry && show);
    if (retry) styleRetry(retry, pair);
    if (show) mine.style.cssText = pair
      ? "display:inline-block;vertical-align:top;width:calc(50% - 4px);margin:8px 0 0 8px"
      : "display:block;margin-top:8px";
  }
}

function styleRetry(button, half) {
  if (!document.getElementById("kb-hub-retry-style")) {
    const style = document.createElement("style");
    style.id = "kb-hub-retry-style";
    style.textContent = `
      button.kb-hub-retry { display: inline-block; vertical-align: top; box-sizing: border-box; width: 100%; height: 48px; margin: 8px 0 0; padding: 0;
        border: 1px solid #d9e1ec; border-radius: 10px; background: #fff; color: #173b80; font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
      button.kb-hub-retry.kb-hub-half { width: calc(50% - 4px); }
      button.kb-hub-retry:hover { background: #eef3fb; }
      button.kb-hub-retry:focus-visible { outline: 2px solid #173b80; outline-offset: 2px; }`;
    document.head.append(style);
  }
  button.classList.add("kb-hub-retry");
  button.classList.toggle("kb-hub-half", half);
}

// 포털 화면 안의 두 버튼은 포털 모양·색을 따름: 높이 48, 모서리 10, 남색 (페이지 CSS 와 섞이지 않게 shadow DOM)
function uploadButton() {
  const host = document.createElement("kb-hub-upload");
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = `<style>
    button { width: 100%; height: 48px; box-sizing: border-box; border: 1px solid #173b80; border-radius: 10px; background: #173b80; color: #fff;
             font-family: inherit; font-size: 16px; font-weight: 700; cursor: pointer; }
    button:hover { background: #122f66; }
    button:focus-visible { outline: 2px solid #173b80; outline-offset: 2px; }
  </style><button type="button">GitHub에 올리기</button>`;
  root.querySelector("button").onclick = () => {
    const found = practical() ? readSql() : readCoding();
    handle(found && { ...found, again: true });
  };
  return host;
}

new MutationObserver(syncUploadButton).observe(document.documentElement, { subtree: true, childList: true, attributeFilter: ["aria-pressed"] });
syncUploadButton();

// 문제 정보는 누른 순간의 것을 씀 (확인 창이 떠 있는 동안 문제가 바뀌어도)
// url 은 누른 순간의 것. 다시 입력할 때도 그대로 넘김
function solved(found, url = location.href) {
  const { id, title, code, ext, problem, draft, again } = found;
  // 확인 창에 알려 줄 것. 있으면 설정과 상관없이 확인을 받음
  const note = draft ? "화면에서 코드를 못 읽어, 포털에 임시 저장된 답을 올려요. 최신이 아닐 수 있어요."
    : again ? "지금 화면에 있는 코드를 올려요. 포털 풀이 기록은 바뀌지 않아요." : "";
  chrome.storage.local.get({ askFirst: true, withProblem: true, folder: KB.FOLDER, theme: "" }, async cfg => {
    card.theme(cfg.theme);
    card.show({ text: "GitHub 확인 중…", keep: true });
    // 같은 문제를 다시 올리면 GitHub 폴더에 있는 이름을 그대로
    const old = (await chrome.runtime.sendMessage({ type: "existingName", id, title, ext }).catch(() => null))?.name;
    let name = old || KB.idName(id, ext);
    if (cfg.askFirst || note) {
      const typed = await card.ask({ id, title, folder: KB.folderFor(cfg.folder, id, ext), name, ext, old, note });
      if (typed === null) return card.show({ text: "올리지 않았어요." });
      name = KB.fileName(typed, ext);
      if (!name) return card.show({ text: BAD_NAME, tone: "err", action: ["다시 입력", () => stale() || solved(found, url)] });
    }
    send({ id, code, title, name, url, ext, problem: cfg.withProblem ? problem : null });
  });
}

// 화면의 문제 문장과 입출력 예제 (해설·정답은 읽지 않음)
function readProblem() {
  const text = s => document.querySelector(s)?.textContent.trim() || "";
  const statement = text("#coding-statement");
  if (!statement) return null;
  // 예제는 앞뒤 공백이 뜻을 가지므로 앞뒤 빈 줄만 없앰
  const keep = el => (el?.textContent || "").replace(/^(\r?\n)+|(\r?\n)+$/g, "");
  const examples = [[keep(document.querySelector("#coding-input")), keep(document.querySelector("#coding-output"))]];
  const extra = document.querySelector("#coding-extra-examples");
  if (extra && !extra.hidden) for (const box of extra.querySelectorAll(".coding-extra-example"))
    examples.push([...box.querySelectorAll("pre")].slice(0, 2).map(keep));
  // 칸 이름은 화면에 적힌 것을 씀 (Ubuntu 는 '초기 실행 환경' / '예상 실행 결과')
  const labels = [["#coding-input-label", "입력"], ["#coding-output-label", "출력"]].map(([s, d]) => text(s).replace(/ 예제$/, "") || d);
  return { level: text("#coding-level"), topic: text("#coding-topic"), labels, statement, examples: examples.filter(([i, o]) => i || o) };
}

function send(msg) {
  card.show({ text: "GitHub에 올리는 중…", keep: true });
  chrome.runtime.sendMessage(msg, res => res?.ok
    ? card.show({ head: "저장했어요", path: res.path, tone: "ok" })
    // 채점한 문제는 '맞혔어요'가 비활성이라, 다시 올리는 버튼은 여기에 있어야 함
    : card.show({ head: "올리지 못했어요", text: res?.error || chrome.runtime.lastError?.message, tone: "err", action: ["다시 올리기", () => stale() || send(msg)] }));
}

// 오른쪽 아래 알림 카드 (페이지 CSS 와 섞이지 않게 shadow DOM)
const card = (() => {
  let host, root, timer;
  const css = `
    @font-face { font-family: "Pretendard"; font-weight: 45 920; src: url(${chrome.runtime.getURL("fonts/PretendardVariable.woff2")}) format("woff2-variations"); }
    /* 색: IBM Carbon Design System (Apache-2.0) */
    :host { --bg:#fff; --text:#161616; --sub:#6f6f6f; --fill:#f4f4f4; --blue:#0f62fe; --red:#da1e28; --green:#198038; }
    :host([data-theme=dark]) { --bg:#262626; --text:#f4f4f4; --sub:#c6c6c6; --fill:#393939; --red:#ff8389; --green:#42be65; }
    .c { position: fixed; right: 24px; bottom: 24px; z-index: 2147483647; width: 340px; padding: 20px; border-radius: 20px;
         background: var(--bg); color: var(--text); box-shadow: 0 8px 32px rgba(0,0,0,.18);
         font: 15px/1.5 "Pretendard", -apple-system, "Malgun Gothic", sans-serif; animation: up .2s ease-out; }
    @keyframes up { from { transform: translateY(12px); opacity: 0; } }
    /* 확인 창: 화면 가운데 모달, 뒤는 어둡게 */
    .dim { position: fixed; inset: 0; z-index: 2147483647; background: rgba(0,0,0,.45); display: grid; place-items: center; animation: fade .15s; }
    @keyframes fade { from { opacity: 0; } }
    .dim .c { position: static; width: 380px; padding: 24px; animation: pop .18s ease-out; }
    @keyframes pop { from { transform: scale(.96); opacity: 0; } }
    h3 { margin: 0 0 4px; font-size: 18px; font-weight: 700; }
    p { margin: 0; color: var(--sub); font-size: 13px; word-break: keep-all; overflow-wrap: anywhere; }
    p + p { margin-top: 8px; }
    .path { margin-top: 8px; padding: 10px 12px; border-radius: 10px; background: var(--fill); }
    .path span { display: inline-block; max-width: 100%; }
    .ok h3 { color: var(--green); } .err h3 { color: var(--red); }
    input { width: 100%; box-sizing: border-box; height: 44px; margin: 14px 0 4px; padding: 0 14px; border: 2px solid transparent;
            border-radius: 12px; background: var(--fill); color: var(--text); font: inherit; outline: none; }
    input:focus { border-color: var(--blue); }
    .btns { display: flex; gap: 8px; margin-top: 12px; }
    button { flex: 1; height: 44px; border: 0; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; }
    .no { background: var(--fill); color: var(--text); } .yes { background: var(--blue); color: #fff; }`;

  function attach() {
    if (host) return;
    host = document.createElement("kb-hub-card");
    root = host.attachShadow({ mode: "open" });
    document.documentElement.append(host);
  }
  function mount(html, cls = "", modal = false) {
    attach();
    clearTimeout(timer);
    const box = modal
      ? `<div class="dim"><div class="c" role="dialog" aria-modal="true" aria-labelledby="kbh">${html}</div></div>`
      : `<div class="c ${cls}" role="status">${html}</div>`;
    root.innerHTML = `<style>${css}</style>${box}`;
  }
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  // 경로는 '/' 단위로 묶어 폴더 이름 중간에서 줄이 끊기지 않게
  const segments = s => String(s).split("/").map((part, i, all) => `<span>${esc(part)}${i < all.length - 1 ? "/" : ""}</span>`).join("");
  const close = () => { if (root) root.innerHTML = ""; };

  return {
    theme(t) {
      attach(); // 빈 카드를 그리지 않음
      host.dataset.theme = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    },
    // action: [버튼 이름, 할 일]. 있으면 누를 때까지 카드를 닫지 않음
    show({ head = "", text = "", path = "", tone = "", keep = false, action }) {
      mount((head ? `<h3>${esc(head)}</h3>` : "") + (path ? `<p class="path">${segments(path)}</p>` : `<p>${esc(text)}</p>`)
        + (action ? `<div class="btns"><button class="no">닫기</button><button class="yes">${esc(action[0])}</button></div>` : ""), tone);
      if (action) {
        root.querySelector(".no").onclick = close;
        root.querySelector(".yes").onclick = action[1];
      } else if (!keep) timer = setTimeout(close, tone === "err" ? 10000 : 5000);
    },
    ask({ id, title, folder, name, ext = "java", old, note }) {
      mount(`<h3 id="kbh">GitHub에 올릴까요?</h3><p>[${esc(id)}] ${esc(title)}</p>
        <p class="path">${segments(folder + "/")}<br>${segments(KB.dirName(id, title) + "/(이름)." + ext)}</p>
        ${old ? `<p>이름을 바꾸면 예전 파일(${esc(old)}.${ext})은 지워져요.</p>` : ""}
        ${note ? `<p>${esc(note)}</p>` : ""}
        <input aria-label="파일 이름" value="${esc(name)}" spellcheck="false">
        <div class="btns"><button class="no">취소</button><button class="yes">올리기</button></div>`, "", true);
      const input = root.querySelector("input");
      input.focus(); input.select();
      return new Promise(done => {
        const finish = v => { close(); done(v); };
        root.querySelector(".no").onclick = () => finish(null);
        root.querySelector(".yes").onclick = () => finish(input.value);
        input.onkeydown = ev => { if (ev.key === "Enter") finish(input.value); if (ev.key === "Escape") finish(null); };
      });
    },
  };
})();
