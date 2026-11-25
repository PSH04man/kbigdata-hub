importScripts("lib.js");

// 1.7.0 부터 이름 짓기를 없애서, 남아 있는 키·설정은 지움
chrome.storage.local.remove(["gemini", "nameMode"]);

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "existingName") { // 다른 PC에서 이미 올린 이름이 있으면 그걸 다시 씀
    config().then(cfg => fileIn(cfg, problemDir(cfg, msg), msg.ext || KB.lang(msg.id).ext)).then(name => reply({ name }), () => reply({ name: null }));
    return true;
  }
  upload(msg).then(path => reply({ ok: true, path }), err => reply({ ok: false, error: KB.friendly(err.message) }));
  return true; // 비동기 응답
});

async function config() {
  const cfg = await chrome.storage.local.get({ token: "", repo: "", branch: "", folder: "k-bigdataPortal/기초350/Java", names: {} });
  if (!cfg.token) throw new Error("설정에서 GitHub 토큰을 넣어 주세요.");
  cfg.folder = KB.curFolder(cfg.folder);
  if (!KB.isKey(cfg.token)) throw new Error("GitHub 토큰에 한글이나 공백이 섞여 있어요. 설정에서 토큰만 다시 넣어 주세요.");
  cfg.repo = KB.normRepo(cfg.repo); // 예전에 주소째 저장한 값도 받아 줌
  if (!cfg.repo) throw new Error("설정의 저장소 설정에 '아이디/저장소' 형식으로 넣어 주세요. (예: hong/codingTest)");
  if (!cfg.branch) { // 비워 두면 저장소 기본 브랜치
    const r = await fetch(`https://api.github.com/repos/${cfg.repo}`, { headers: { Authorization: `Bearer ${cfg.token}` } });
    if (!r.ok) throw new Error(KB.explain("GitHub", r.status));
    cfg.branch = (await r.json()).default_branch;
  }
  return cfg;
}

// 문제 폴더 경로. 폴더 설정은 350제 Java 용, 실기 SQL 은 고정, 다른 언어는 그 옆에
function problemDir(cfg, { id, title, ext }) {
  const folder = ext === "sql" ? "k-bigdataPortal/정보처리실기/SQL" : KB.folderFor(cfg.folder, id);
  return `${folder}/${KB.dirName(id, title)}`; // 문제마다 폴더 하나라 다른 문제와 이름이 안 겹침
}

// 문제 폴더에 이미 있는 풀이 파일의 이름 (없으면 null)
async function fileIn(cfg, dir, ext) {
  const res = await gh(cfg, dir);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(KB.explain("GitHub", res.status));
  const list = await res.json();
  const file = Array.isArray(list) && list.find(f => f.type === "file" && f.name.endsWith("." + ext));
  return file ? file.name.slice(0, -ext.length - 1) : null;
}

async function upload({ id, title, code, url, name, ext = "java", problem }) {
  const cfg = await config();
  const dir = problemDir(cfg, { id, title, ext });
  const old = await fileIn(cfg, dir, ext);
  name = KB.fileName(name, ext) || old || KB.idName(id); // 사람이 적은 이름이 우선
  const message = `${id} ${title} (${name})\n\n${url}`;
  const date = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (내 PC 시간대)

  const path = `${dir}/${name}.${ext}`;
  const files = { [`${dir}/README.md`]: KB.readme({ id, title, url, name, date, ext, problem }), [path]: ext === "java" ? KB.renameClass(code, name) : code };
  if (old && old !== name) files[`${dir}/${old}.${ext}`] = null; // 이름을 바꾸면 예전 파일은 지움 (파일이 2개가 되지 않게)
  await commit(cfg, files, message);

  cfg.names[id] = name;
  await chrome.storage.local.set({ names: cfg.names });
  return path;
}

// 여러 파일을 커밋 하나로 올리기 (Git Data API). 빈 저장소는 이 API가 안 돼서 파일별로 올림
async function commit(cfg, files, message) {
  const ref = await api(cfg, `git/ref/heads/${cfg.branch}`);
  if (ref.status === 409 || ref.status === 404) { // 409: 빈 저장소, 404: 브랜치 없음
    for (const [path, text] of Object.entries(files)) if (text !== null) await put(cfg, path, text, message, ref.status === 409);
    return;
  }
  const parent = (await ok(ref)).object.sha;
  const baseTree = (await ok(await api(cfg, `git/commits/${parent}`))).tree.sha;
  const tree = await ok(await api(cfg, "git/trees", { method: "POST", body: JSON.stringify({
    base_tree: baseTree, tree: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", ...(content === null ? { sha: null } : { content }) })),
  }) }));
  const made = await ok(await api(cfg, "git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) }));
  const moved = await api(cfg, `git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: made.sha }) });
  if (moved.status === 422) throw new Error(KB.explain("GitHub", 409)); // 그사이 다른 커밋이 올라옴 → 다시 누르면 됨
  await ok(moved);
}

// 파일 하나 올리기 (있으면 덮어쓰기). empty: 빈 저장소면 브랜치를 안 적어야 첫 커밋이 만들어짐
async function put(cfg, path, text, message, empty) {
  const existing = empty ? null : await getFile(cfg, path);
  const body = { message, content: KB.base64(text) };
  if (!empty) body.branch = cfg.branch;
  if (existing) body.sha = existing.sha; // 같은 문제 다시 풀면 덮어쓰기
  const res = await gh(cfg, path, { method: "PUT", body: JSON.stringify(body) });
  await ok(res);
}

async function ok(res) {
  if (!res.ok) throw new Error(KB.explain("GitHub", res.status));
  return res.json();
}

function api(cfg, path, init = {}) {
  return fetch(`https://api.github.com/repos/${cfg.repo}/${path}`, {
    cache: "no-store", // 캐시된 예전 커밋 sha 를 쓰면 연달아 올릴 때 409
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
  });
}

function gh(cfg, path, init = {}) {
  const enc = path.split("/").map(encodeURIComponent).join("/");
  return fetch(`https://api.github.com/repos/${cfg.repo}/contents/${enc}?ref=${cfg.branch}`, {
    cache: "no-store", // 캐시된 예전 커밋 sha 를 쓰면 연달아 올릴 때 409
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
  });
}

async function getFile(cfg, path) {
  const res = await gh(cfg, path);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(KB.explain("GitHub", res.status));
  return res.json();
}
