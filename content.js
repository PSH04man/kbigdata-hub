// '맞혔어요' 클릭을 잡아서 이름을 정하고 background 로 넘긴다
const CHANGED = "포털 화면이 바뀌어서 문제 정보를 못 찾았어요. 확장프로그램 업데이트가 필요해요.";
const SQL_FOLDER = "k-bigdataPortal/정보처리실기/SQL";
const STALE = "확장프로그램이 새로고침(업데이트)됐어요. 이 페이지를 새로고침한 뒤 다시 해 주세요.";
const BAD_NAME = "이름에는 글자·숫자·_ 만 쓸 수 있고 숫자로 시작할 수 없어요. '맞혔어요'를 다시 눌러 주세요.";
const stale = () => !chrome.runtime?.id && (card.show({ head: "새로고침이 필요해요", text: STALE, tone: "err" }), true); // 확장이 갈리면 옛 탭은 먹통
document.addEventListener("click", e => {
  if (location.pathname?.endsWith("/practical.html")) { // 실기: 직접 쓰는 SQL 작성 문제만 올림
    if (!e.target.closest?.('.study-review [data-grade="correct"]') || stale()) return;
    const answer = document.querySelector('textarea#my-answer[rows="7"]'); // rows=7 은 SQL 작성 유형
    const id = new URL(location.href).searchParams.get("id");
    if (!answer || !id) return;
    if (!answer.value.trim()) return card.show({ text: "작성한 SQL이 없어서 올리지 않았어요." });
    const title = document.querySelector("#solve-title")?.textContent.trim() || id;
    return sqlUpload({ id, title, code: answer.value, url: location.href });
  }
  const btn = e.target.closest?.('#coding-review-slot [data-grade="correct"]');
  if (!btn) { // 글자는 '맞혔어요'인데 위치가 다르면 포털 화면이 바뀐 것
    if (e.target.closest?.("button, a, [role=button]")?.textContent.trim() === "맞혔어요") card.show({ head: "올릴 수 없어요", text: CHANGED, tone: "err" });
    return;
  }
  if (stale()) return;
  const idEl = document.querySelector("#coding-id"), editor = document.querySelector("#coding-editor");
  if (!idEl || !editor) return card.show({ head: "올릴 수 없어요", text: CHANGED, tone: "err" });
  const id = idEl.textContent.trim();
  const code = editor.value || "";
  const title = document.querySelector("#coding-title")?.textContent.trim() || id;
  if (!code.trim()) return card.show({ text: "작성한 코드가 없어서 올리지 않았어요." });
  const { ext } = KB.lang(id);
  const url = location.href, shown = readProblem(); // 확인 창이 떠 있는 동안 문제가 바뀌어도 누른 순간의 문제를 씀
  chrome.storage.local.get({ askFirst: true, folder: "k-bigdataPortal/기초350/Java", theme: "", names: {} }, async cfg => {
    card.theme(cfg.theme);
    cfg.folder = KB.curFolder(cfg.folder);
    // 같은 문제를 다시 올리면 같은 파일: GitHub 폴더에 있는 이름 → 없으면 이 브라우저 기억
    const old = (await chrome.runtime.sendMessage({ type: "existingName", id, title }).catch(() => null))?.name;
    let name = old || cfg.names[id] || KB.idName(id);
    if (cfg.askFirst) {
      const typed = await card.ask({ id, title, folder: KB.folderFor(cfg.folder, id), name, ext, old });
      if (typed === null) return card.show({ text: "올리지 않았어요." });
      name = KB.fileName(typed, ext);
      if (!name) return card.show({ text: BAD_NAME, tone: "err" });
    }
    const { withProblem } = await new Promise(done => chrome.storage.local.get({ withProblem: true }, done));
    send({ id, code, title, name, url, ext, problem: withProblem ? shown : null });
  });
}, true);


function sqlUpload({ id, title, code, url }) {
  chrome.storage.local.get({ askFirst: true, theme: "", names: {} }, async cfg => {
    card.theme(cfg.theme);
    const old = (await chrome.runtime.sendMessage({ type: "existingName", id, title, ext: "sql" }).catch(() => null))?.name;
    let name = old || cfg.names[id] || "Query" + (id.match(/\d+$/)?.[0] || "");
    if (cfg.askFirst) {
      const typed = await card.ask({ id, title, folder: SQL_FOLDER, name, ext: "sql", old });
      if (typed === null) return card.show({ text: "올리지 않았어요." });
      name = KB.fileName(typed, "sql");
      if (!name) return card.show({ text: BAD_NAME, tone: "err" });
    }
    send({ id, code, title, name, url, ext: "sql" });
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
    ? card.show({ head: "저장했어요", text: res.path, tone: "ok" })
    : card.show({ head: "올리지 못했어요", text: res?.error || chrome.runtime.lastError?.message, tone: "err" }));
}

// 오른쪽 아래 알림 카드 (페이지 CSS 와 섞이지 않게 shadow DOM)
const card = (() => {
  let host, root, timer;
  const css = `
    @font-face { font-family: "Pretendard"; font-weight: 45 920; src: url(${chrome.runtime.getURL("fonts/PretendardVariable.woff2")}) format("woff2-variations"); }
    :host { --bg:#fff; --text:#191f28; --sub:#8b95a1; --fill:#f2f4f6; --blue:#3182f6; --red:#f04452; --green:#03b26c; }
    :host([data-theme=dark]) { --bg:#202027; --text:#e4e4e5; --sub:#9e9ea4; --fill:#2c2c35; }
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
    p { margin: 0; color: var(--sub); font-size: 13px; word-break: break-all; }
    .ok h3 { color: var(--green); } .err h3 { color: var(--red); }
    input { width: 100%; box-sizing: border-box; height: 44px; margin: 14px 0 4px; padding: 0 14px; border: 2px solid transparent;
            border-radius: 12px; background: var(--fill); color: var(--text); font: inherit; outline: none; }
    input:focus { border-color: var(--blue); }
    .btns { display: flex; gap: 8px; margin-top: 12px; }
    button { flex: 1; height: 44px; border: 0; border-radius: 12px; font: inherit; font-weight: 700; cursor: pointer; }
    .no { background: var(--fill); color: var(--text); } .yes { background: var(--blue); color: #fff; }`;

  function mount(html, cls = "", modal = false) {
    if (!host) {
      host = document.createElement("kb-hub-card");
      root = host.attachShadow({ mode: "open" });
      document.documentElement.append(host);
    }
    clearTimeout(timer);
    const box = modal
      ? `<div class="dim"><div class="c" role="dialog" aria-modal="true" aria-labelledby="kbh">${html}</div></div>`
      : `<div class="c ${cls}" role="status">${html}</div>`;
    root.innerHTML = `<style>${css}</style>${box}`;
  }
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => `&#${c.charCodeAt(0)};`);
  const close = () => { if (root) root.innerHTML = ""; };

  return {
    theme(t) {
      if (!host) mount("");
      host.dataset.theme = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    },
    show({ head = "", text = "", tone = "", keep = false }) {
      mount((head ? `<h3>${esc(head)}</h3>` : "") + `<p>${esc(text)}</p>`, tone);
      if (!keep) timer = setTimeout(close, tone === "err" ? 10000 : 5000);
    },
    ask({ id, title, folder, name, ext = "java", old }) {
      mount(`<h3 id="kbh">GitHub에 올릴까요?</h3><p>[${esc(id)}] ${esc(title)}<br>${esc(folder)}/${esc(KB.dirName(id, title))}/(이름).${ext}</p>
        ${old ? `<p>이름을 바꾸면 예전 파일(${esc(old)}.${ext})은 지워져요.</p>` : ""}
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
