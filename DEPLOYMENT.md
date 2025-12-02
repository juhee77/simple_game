# GitHub Pages 배포 가이드

## 방법 1: GitHub 웹사이트에서 직접 설정 (가장 간단)

1. GitHub에 새 저장소 생성
   - 저장소 이름: `simple_game` (또는 원하는 이름)
   - Public으로 설정

2. 코드 업로드
   ```bash
   cd /Users/juhee/IdeaProjects/simple_game
   git init
   git add .
   git commit -m "Initial commit: Mini Game Paradise"
   git branch -M main
   git remote add origin https://github.com/[your-username]/simple_game.git
   git push -u origin main
   ```

3. GitHub Pages 활성화
   - 저장소 페이지에서 Settings 클릭
   - 왼쪽 메뉴에서 "Pages" 클릭
   - Source: "Deploy from a branch" 선택
   - Branch: "main" 선택, 폴더: "/ (root)" 선택
   - Save 클릭

4. 배포 완료!
   - 몇 분 후 `https://[your-username].github.io/simple_game/` 에서 접속 가능

## 방법 2: GitHub Actions 사용 (자동 배포)

이미 `.github/workflows/deploy.yml` 파일이 생성되어 있습니다.

1. 저장소 Settings > Pages에서:
   - Source: "GitHub Actions" 선택

2. 코드를 push하면 자동으로 배포됩니다:
   ```bash
   git add .
   git commit -m "Update games"
   git push
   ```

## 배포 확인

배포가 완료되면:
- Actions 탭에서 배포 상태 확인
- 녹색 체크마크가 뜨면 성공!
- `https://[your-username].github.io/simple_game/` 접속

## 커스텀 도메인 (선택사항)

1. 도메인 구입 (예: Namecheap, GoDaddy)
2. DNS 설정:
   - A 레코드: GitHub Pages IP 주소
   - CNAME 레코드: [your-username].github.io
3. GitHub 저장소 Settings > Pages > Custom domain에 도메인 입력

## 문제 해결

### 404 오류
- Settings > Pages에서 올바른 브랜치가 선택되었는지 확인
- index.html이 루트 디렉토리에 있는지 확인

### 스타일이 안 보임
- 모든 경로가 상대 경로인지 확인
- 브라우저 캐시 삭제 후 새로고침

### 배포가 안 됨
- Actions 탭에서 에러 로그 확인
- 저장소가 Public인지 확인

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

자동으로 재배포됩니다! (GitHub Actions 사용 시)
