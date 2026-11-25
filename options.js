const fields = { token: "", askFirst: true, withProblem: true, repo: "", branch: "", folder: KB.FOLDER };
const $ = id => document.getElementById(id);

// 토큰 보기/숨기기 (잘못 붙여 넣었는지 눈으로 확인)
for (const b of document.querySelectorAll(".peek")) b.onclick = () => {
  const input = $(b.dataset.for), show = input.type === "password";
  input.type = show ? "text" : "password";
  b.textContent = show ? "숨기기" : "보기";
  b.setAttribute("aria-pressed", show);
};

// 테마: 누르는 즉시 바뀌고 따로 저장된다 (안 골랐으면 윈도우 설정을 따름)
const themeBtns = [...document.querySelectorAll(".theme button")];
function setTheme(theme) {
  theme ||= matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.dataset.theme = theme;
  for (const b of themeBtns) { b.classList.toggle("on", b.dataset.theme === theme); b.setAttribute("aria-checked", b.dataset.theme === theme); }
}
for (const b of themeBtns) b.onclick = () => { setTheme(b.dataset.theme); chrome.storage.local.set({ theme: b.dataset.theme }); };
chrome.storage.local.get({ theme: "" }, cfg => setTheme(cfg.theme));

chrome.storage.local.get(fields, cfg => {
  for (const k in fields) $(k)[typeof fields[k] === "boolean" ? "checked" : "value"] = cfg[k];
});
$("save").onclick = () => {
  const cfg = {};
  for (const k in fields) cfg[k] = typeof fields[k] === "boolean" ? $(k).checked : $(k).value.trim();
  cfg.folder = cfg.folder.replace(/^\/+|\/+$/g, "");
  // 잘못 넣은 값은 저장 전에 알려 줌 (올릴 때가 아니라 지금)
  const problem =
    cfg.token && !KB.isKey(cfg.token) ? "GitHub 토큰에 한글이나 공백이 섞여 있어요. 토큰만 다시 복사해 넣어 주세요." :
    cfg.repo && !KB.normRepo(cfg.repo) ? "저장소는 '아이디/저장소' 형식으로 넣어 주세요. (예: hong/codingTest)" : "";
  if (problem) return showStatus(problem, true);
  if (cfg.repo) $("repo").value = cfg.repo = KB.normRepo(cfg.repo);
  chrome.storage.local.set(cfg, () => showStatus("저장했어요"));
};
function showStatus(text, err) {
  $("status").textContent = text;
  $("status").style.color = err ? "#e5484d" : "";
  if (!err) setTimeout(() => $("status").textContent = "", 2000);
};
