# GitHub Pages 배포 가이드

사이트는 **GitHub Actions**(`.github/workflows/deploy.yml`)로만 배포합니다.

> ⚠️ Pages 설정의 Source를 **"Deploy from a branch"로 바꾸지 마세요.**
> 브랜치 배포는 저장소 전체를 그대로 올리기 때문에 `server/`(방 서버 코드·배포 설정)까지 사이트에 공개됩니다.
> Actions 배포는 `.git`·`.github`·`server/`를 빼고 올립니다.

## 처음 설정

1. GitHub에 저장소 만들기
   - 저장소 이름: `simple_game` (또는 원하는 이름)
   - Public으로 설정

2. 코드 올리기
   ```bash
   cd /Users/juhee/IdeaProjects/simple_game
   git init
   git add .
   git commit -m "Initial commit: Mini Game Paradise"
   git branch -M main
   git remote add origin https://github.com/[your-username]/simple_game.git
   git push -u origin main
   ```

3. GitHub Pages 켜기
   - 저장소 Settings → 왼쪽 메뉴 "Pages"
   - Source: **"GitHub Actions"** 선택

   터미널에서 바꿀 수도 있습니다.
   ```bash
   gh api -X PUT repos/[your-username]/simple_game/pages -f build_type=workflow
   ```

4. 배포 완료!
   - `main`에 push하면 자동으로 배포됩니다
   - 몇 분 후 `https://[your-username].github.io/simple_game/` 에서 접속 가능

## 배포 동작

- `main`에 push하면 배포됩니다. 단, `server/`만 바뀐 커밋은 사이트를 다시 올리지 않습니다.
- Actions 탭에서 "Deploy to GitHub Pages"를 골라 **Run workflow**로 직접 다시 배포할 수 있습니다.
- 방 서버(`server/`)는 Pages와 따로 배포합니다 — [server/README.md](server/README.md)의 "배포" 참고.

## 배포 확인

배포가 끝나면:
- Actions 탭에서 "Deploy to GitHub Pages" 실행에 녹색 체크가 뜨는지 확인
- `https://[your-username].github.io/simple_game/` 접속
- `https://[your-username].github.io/simple_game/server/README.md`가 **404**인지 확인 (서버 코드가 빠졌는지)

## 커스텀 도메인 (선택사항)

1. 도메인 구입 (예: Namecheap, GoDaddy)
2. DNS 설정:
   - A 레코드: GitHub Pages IP 주소
   - CNAME 레코드: [your-username].github.io
3. 저장소 Settings > Pages > Custom domain에 도메인 입력

## 문제 해결

### 404 오류
- Settings > Pages에서 Source가 "GitHub Actions"인지 확인
- index.html이 루트 디렉토리에 있는지 확인

### 스타일이 안 보임
- 모든 경로가 상대 경로인지 확인
- 브라우저 캐시 삭제 후 새로고침

### 배포가 안 됨
- Actions 탭에서 에러 로그 확인
- 저장소가 Public인지 확인

### Actions 탭에 "pages build and deployment"가 같이 돈다
- Source가 "Deploy from a branch"로 되어 있다는 뜻입니다. 이 상태면 `server/`가 공개될 수 있으니 "GitHub Actions"로 바꿔 주세요.

## 로컬 테스트

배포 전 로컬에서 테스트:
```bash
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 업데이트

게임을 수정한 후:
```bash
git add .
git commit -m "Update: [변경사항 설명]"
git push
```

`main`에 들어가면 자동으로 다시 배포됩니다.
