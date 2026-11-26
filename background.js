importScripts("lib.js");

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg.type === "existingNames") { // 다른 PC에서 올린 것까지, 이 문제의 풀이 파일 이름
    config().then(cfg => filesIn(cfg, problemDir(cfg, msg), msg.ext)).then(list => reply({ names: list.map(f => f.name) }), () => reply({ names: [] }));
    return true;
  }
  upload(msg).then(path => reply({ ok: true, path }), err => reply({ ok: false, error: KB.friendly(err.message) }));
  return true; // 비동기 응답
});

const branches = {}; // 저장소별 기본 브랜치 (한 번만 물어봄)

async function config() {
  const cfg = await chrome.storage.local.get({ token: "", repo: "", branch: "", folder: KB.FOLDER });
  if (!cfg.token) throw new Error("설정에서 GitHub 토큰을 넣어 주세요.");
  if (!KB.isKey(cfg.token)) throw new Error("GitHub 토큰에 한글이나 공백이 섞여 있어요. 설정에서 토큰만 다시 넣어 주세요.");
  cfg.repo = KB.normRepo(cfg.repo); // 예전에 주소째 저장한 값도 받아 줌
  if (!cfg.repo) throw new Error("설정의 저장소 설정에 '아이디/저장소' 형식으로 넣어 주세요. (예: hong/codingTest)");
  cfg.branch ||= branches[cfg.repo] ||= (await ok(await api(cfg, ""))).default_branch;
  return cfg;
}

// 문제마다 폴더 하나라 다른 문제와 이름이 안 겹침
const problemDir = (cfg, { id, title, ext }) => `${KB.folderFor(cfg.folder, id, ext)}/${KB.dirName(id, title)}`;

// 문제 폴더에 이미 있는 풀이 파일들 (확장자 뗀 이름과 sha). 번호순이라 마지막이 가장 최근 풀이
// shortcut: 직접 지은 이름이 섞이면 '마지막'은 이름순일 뿐, 날짜순이 필요해지면 커밋 기록을 읽을 것
async function filesIn(cfg, dir, ext) {
  const res = await gh(cfg, dir);
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(KB.explain("GitHub", res.status));
  const list = await res.json();
  return (Array.isArray(list) ? list : []).filter(f => f.type === "file" && f.name.endsWith("." + ext))
    .map(f => ({ name: f.name.slice(0, -ext.length - 1), sha: f.sha }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
}

// replace: 덮어쓸 파일 이름. 없으면 새 파일로 추가 (있는 파일은 건드리지 않음)
async function upload({ id, title, code, url, name, ext, problem, replace }) {
  const cfg = await config();
  const dir = problemDir(cfg, { id, title, ext });
  const found = await filesIn(cfg, dir, ext);
  const names = found.map(f => f.name);
  const old = names.includes(replace) ? replace : null;
  name = KB.fileName(name, ext) || old || KB.idName(id, ext); // 사람이 적은 이름이 우선
  const text = n => ext === "java" ? KB.renameClass(code, n) : code;
  if (!old) {
    for (const f of found) if (f.sha === await KB.blobSha(text(f.name))) return `${dir}/${f.name}.${ext} (이미 같은 코드가 있어 올리지 않았어요)`;
    name = KB.freeName(name, names);
  }
  // 덮어쓰며 새 이름을 주면 예전 파일은 지움. 단 그 이름이 다른 풀이 파일이면 아무것도 지우지 않음
  const drop = old && old !== name && !names.includes(name) ? old : null;
  const message = `${id} ${title} (${name})\n\n${url}`;
  const date = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD (내 PC 시간대)

  const path = `${dir}/${name}.${ext}`;
  const all = [...new Set([...names.filter(n => n !== drop), name])];
  const files = { [`${dir}/README.md`]: KB.readme({ id, title, url, name, date, ext, problem, names: all }), [path]: text(name) };
  if (drop) files[`${dir}/${drop}.${ext}`] = null;
  const same = (await commit(cfg, files, message)) === false;
  return same ? `${path} (이미 같은 내용이라 커밋하지 않았어요)` : path;
}

// 여러 파일을 커밋 하나로 올리기 (Git Data API). 빈 저장소는 이 API가 안 돼서 파일별로 올림
async function commit(cfg, files, message) {
  const head = await api(cfg, `commits/${cfg.branch}`); // 마지막 커밋과 트리를 한 번에
  if ([404, 409, 422].includes(head.status)) { // 409: 빈 저장소, 404·422: 브랜치 없음
    for (const [path, text] of Object.entries(files)) if (text !== null) await put(cfg, path, text, message, head.status === 409);
    return;
  }
  const { sha: parent, commit: { tree: { sha: baseTree } } } = await ok(head);
  const tree = await ok(await api(cfg, "git/trees", { method: "POST", body: JSON.stringify({
    base_tree: baseTree, tree: Object.entries(files).map(([path, content]) => ({ path, mode: "100644", type: "blob", ...(content === null ? { sha: null } : { content }) })),
  }) }));
  if (tree.sha === baseTree) return false; // 파일 내용이 지금과 똑같으면 빈 커밋을 만들지 않음
  const made = await ok(await api(cfg, "git/commits", { method: "POST", body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }) }));
  const moved = await api(cfg, `git/refs/heads/${cfg.branch}`, { method: "PATCH", body: JSON.stringify({ sha: made.sha }) });
  if (moved.status === 422) throw new Error(KB.explain("GitHub", 409)); // 그사이 다른 커밋이 올라옴 → 다시 누르면 됨
  await ok(moved);
}

// 파일 하나 올리기 (있으면 덮어쓰기). empty: 빈 저장소면 브랜치를 안 적어야 첫 커밋이 만들어짐
async function put(cfg, path, text, message, empty) {
  const found = empty ? null : await gh(cfg, path);
  const existing = found && found.status !== 404 ? await ok(found) : null;
  const body = { message, content: KB.base64(text) };
  if (!empty) body.branch = cfg.branch;
  if (existing) body.sha = existing.sha; // 같은 문제 다시 풀면 덮어쓰기
  await ok(await gh(cfg, path, { method: "PUT", body: JSON.stringify(body) }));
}

async function ok(res) {
  if (!res.ok) throw new Error(KB.explain("GitHub", res.status));
  return res.json();
}

function api(cfg, path, init = {}) {
  return fetch(`https://api.github.com/repos/${cfg.repo}${path && "/" + path}`, {
    cache: "no-store", // 캐시된 예전 커밋 sha 를 쓰면 연달아 올릴 때 409
    ...init,
    headers: { Authorization: `Bearer ${cfg.token}`, Accept: "application/vnd.github+json" },
  });
}

const gh = (cfg, path, init) => api(cfg, `contents/${path.split("/").map(encodeURIComponent).join("/")}?ref=${cfg.branch}`, init);
