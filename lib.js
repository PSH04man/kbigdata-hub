// 순수 함수만 모음 (background.js 와 test.js 가 같이 씀)
const KB = {
  // 사람이 적은 파일 이름: 바꾸지 않고 그대로 쓰거나(확장자만 뗌) 안 되면 null. 자바는 클래스 이름이라 - 불가
  fileName(text, ext = "java") {
    const name = String(text || "").trim().replace(new RegExp(`\\.${ext}$`, "i"), "");
    const ok = ext === "java" ? /^[\p{L}_][\p{L}\p{N}_]{0,59}$/u : /^[\p{L}_][\p{L}\p{N}_-]{0,59}$/u;
    return ok.test(name) ? name : null;
  },
  // 네트워크 오류 같은 영어 메시지를 한국어로
  friendly(message) {
    return /failed to fetch|networkerror|load failed/i.test(message) ? "인터넷에 연결할 수 없어요. 연결을 확인하고 '맞혔어요'를 다시 눌러 주세요." : message;
  },
  // API 오류 코드 → 한국어 설명
  explain(service, status) {
    const msg = {
      GitHub: {
        401: "토큰이 틀렸거나 만료됐어요. 설정에서 토큰을 새로 넣어 주세요.",
        403: "토큰에 쓰기 권한이 없어요. 토큰의 Contents 권한을 Read and write로 바꿔 주세요.",
        404: "저장소·브랜치를 못 찾았어요. 설정의 저장소 이름과 토큰의 저장소 선택을 확인해 주세요.",
        409: "같은 파일이 동시에 바뀌었어요. '맞혔어요'를 다시 눌러 주세요.",
        422: "GitHub가 요청을 거절했어요. 폴더·파일 이름을 확인해 주세요.",
      },
    }[service]?.[status];
    return `${service} ${status}: ${msg || "알 수 없는 오류예요."}`;
  },
  // 기본 이름: JAVA-030 → Main030 (번호가 없으면 Main)
  idName(id) {
    return "Main" + (String(id).match(/\d+$/)?.[0] || "");
  },
  // 저장소 칸: 주소를 통째로 붙여 넣어도 "아이디/저장소"로 정리, 안 되면 null
  normRepo(text) {
    const s = String(text || "").trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "").replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
    return /^[\w.-]+\/[\w.-]+$/.test(s) ? s : null;
  },
  // 토큰·키는 HTTP 헤더로 가므로 영문·숫자·기호만 (한글이 섞이면 fetch 가 실패)
  isKey(text) {
    return /^[\x21-\x7e]+$/.test(String(text || ""));
  },
  // 문제 번호 앞부분으로 언어 판별. 처음 보는 유형은 그 이름의 폴더에 .txt (확장 수정 없이 대응)
  lang(id) {
    const prefix = String(id).replace(/[-_ ]?\d+$/, "").toUpperCase().replace(/[^A-Z0-9-]/g, "") || "OTHER";
    const known = { JAVA: ["Java", "java"], C: ["C", "c"], PY: ["Python", "py"], PYTHON: ["Python", "py"], LINUX: ["Ubuntu", "sh"], UBUNTU: ["Ubuntu", "sh"] };
    const [dir, ext] = known[prefix] || [prefix, "txt"];
    return { dir, ext };
  },
  // 예전 기본 폴더로 저장해 둔 설정은 새 기본 폴더로
  curFolder(folder) {
    return folder === "kbigdata_350/Java" ? "k-bigdataPortal/기초350/Java" : folder;
  },
  // 설정 폴더(Java 용) 옆에 언어별 폴더: k-bigdataPortal/기초350/Java → k-bigdataPortal/기초350/C
  folderFor(folder, id) {
    const { dir } = KB.lang(id);
    if (dir === "Java") return folder;
    return [folder.replace(/(^|\/)Java$/i, ""), dir].filter(Boolean).join("/");
  },
  // 문제별 폴더 이름: "JAVA-030. 삼각형 성립 여부" (윈도우에서 clone 안 되는 글자는 공백으로)
  dirName(id, title) {
    const t = String(title || "").replace(/[\\/:*?"<>|\x00-\x1f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 60).replace(/[. ]+$/, "");
    return t && t !== id ? `${id}. ${t}` : id;
  },
  // 문제 폴더에 같이 올리는 README (problem 이 있으면 문제 문장·입출력 예제도)
  readme({ id, title, url, name, date, ext = "java", problem }) {
    const plain = t => String(t).replace(/[\\`*_<>|#[\]]/g, "\\$&"); // 문제 문장이 마크다운·HTML 로 해석되지 않게
    const block = t => { const fence = String(t).includes("```") ? "````" : "```"; return `${fence}\n${t}\n${fence}`; };
    const tags = [problem?.level, problem?.topic].filter(Boolean).map(t => ` · ${plain(t)}`).join("");
    const out = [`# [${id}] ${plain(title)}`, `[문제 링크](${url})${tags}`];
    if (problem?.statement) {
      out.push("## 문제", plain(problem.statement).split("\n").join("  \n"));
      const [inName, outName] = problem.labels || ["입력", "출력"];
      problem.examples.forEach(([input, output], i) => out.push(`## 입출력 예제 ${i + 1}`, plain(inName), block(input), plain(outName), block(output)));
    }
    out.push("---", `- 풀이 파일: \`${name}.${ext}\`\n- 제출 일자: ${date}`);
    return out.join("\n\n") + "\n";
  },
  // 파일 이름과 맞도록 public class(없으면 class Main) 이름 교체. new Main()·생성자·Main.x 도 같이, 문자열·주석은 그대로
  renameClass(code, name) {
    const skip = /"""[\s\S]*?"""|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\/\/[^\n]*|\/\*[\s\S]*?\*\//.source;
    const bare = code.replace(new RegExp(skip, "g"), " ");
    const old = bare.match(/public\s+(?:(?:final|abstract)\s+)?class\s+([A-Za-z_]\w*)/)?.[1] || (/\bclass\s+Main\b/.test(bare) ? "Main" : null);
    if (!old || old === name) return code;
    return code.replace(new RegExp(`(${skip})|\\b${old}\\b`, "g"), (m, kept) => kept ?? name);
  },
  base64(text) {
    let bin = "";
    for (const b of new TextEncoder().encode(text)) bin += String.fromCharCode(b);
    return btoa(bin);
  },
};
globalThis.KB = KB;
