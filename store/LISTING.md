# 크롬 웹 스토어 등록 정보 (복사해서 붙여 넣기)

## 이름
K-BigData Hub

## 요약 (132자 이내)
포털 코딩 350제(Java·C·Python·Ubuntu)·실기 SQL에서 '맞혔어요'를 누르면 내 답을 GitHub에 올립니다.

## 카테고리
도구 (Tools) — 또는 교육 (Education)

## 언어
한국어

## 상세 설명
K-BigData 포털에서 푼 코드를 내 GitHub에 올려 줍니다.
'맞혔어요'만 누르면 됩니다. 코드를 복사해 파일을 만들 필요가 없습니다.

● 되는 문제
기초 코딩 350제(Java, C, Python, Ubuntu), 정보처리 실기 SQL 작성

● 올라가는 것
문제마다 폴더 하나가 생기고, 내 답과 README가 들어갑니다.
350제는 문제와 입출력 예제도 README에 적힙니다. 원치 않으면 설정에서 끄세요.
정답 코드는 올리지 않습니다.

● 다시 풀었다면
새 파일로 남길지, 예전 파일을 덮어쓸지 고를 수 있습니다.

● 처음 한 번만
1. GitHub에서 Fine-grained 토큰을 만듭니다. 저장소는 하나만 고르고, Contents를 Read and write로 설정합니다.
2. 확장 아이콘을 눌러 토큰과 저장소(아이디/저장소)를 저장합니다.

토큰은 내 브라우저에만 저장되고, GitHub 말고는 보내지 않습니다.

## 권한 사유 (심사 양식의 "권한 정당성" 칸)
- storage: 토큰·설정·문제별 파일 이름을 브라우저에 저장
- host https://api.github.com/*: 사용자의 저장소에 코드 파일 업로드
- content script https://portal.k-bigdata.kr/coding.html*, practical.html*: 문제 번호·제목·작성한 답을 읽고 '맞혔어요' 클릭을 감지
- 원격 코드 사용: 없음

## 단일 목적 설명
학과 포털 코딩 문제의 내 풀이 코드를 내 GitHub 저장소에 올리는 것.

## 테스트 안내 (심사 양식의 "테스트 안내" 칸, [LINK] 는 영상 주소로 바꾸기)

### 영어 (칸에 넣을 것)
Works only on portal.k-bigdata.kr (our university's student portal). It requires a student login, so reviewers cannot access it. Demo video: [LINK]
Flow:
1. In options, save a GitHub fine-grained token (one repo, Contents: read/write) and owner/repo.
2. Solve a coding problem on the portal and click "맞혔어요" (I solved it).
3. Confirm the file name and click "올리기" (Upload).
4. One commit adds the code and README.md to that repo.

### 한글 (참고)
학과 학생 전용 포털(portal.k-bigdata.kr)에서만 동작하며 학생 로그인이 필요해 외부에서는 접속할 수 없습니다. 동작 영상: [LINK]
1. 설정에 GitHub 토큰(저장소 1개, Contents 읽기·쓰기)과 저장소 저장
2. 포털에서 문제를 풀고 '맞혔어요' 클릭
3. 파일 이름 확인 후 '올리기'
4. 저장소에 코드와 README.md가 커밋 1개로 추가됨

## 개인정보처리방침 URL
https://gist.github.com/PSH04man/b8c225e20499e2a76c132e46a57e10af

## 필요한 이미지
- 아이콘 128×128: icons/icon128.png
- 스크린샷 1280×800 (1~5장): 직접 찍기 — 가운데 확인 창이 뜬 화면, 설정 창 화면 추천
