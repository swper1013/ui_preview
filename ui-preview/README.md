# UI Preview

이 디렉토리는 `testmodeWeb`의 화면을 백엔드 없이 확인하기 위한 정적 프리뷰입니다.

## 포함 페이지

- `index.html`: 로그인 프리뷰
- `dashboard.html`: 대시보드 프리뷰
- `devices.html`: 장치 목록
- `device-detail.html`: 장치 상세
- `device-form.html`: 장치 등록/수정 폼
- `users.html`: 관리자 목록
- `user-form.html`: 관리자 등록/수정 폼

## Vercel 연결

1. GitHub에서 현재 레포를 Vercel에 연결합니다.
2. `Root Directory`를 `ui-preview`로 지정합니다.
3. Framework Preset은 `Other` 또는 `Static` 감지값을 사용합니다.
4. 배포 후 `index.html`이 기본 진입점이 됩니다.

## 운영 원칙

- CSS는 현재 프로젝트의 `src/main/resources/static/css/app.css`를 복사해서 사용합니다.
- 레이아웃 클래스명과 블록 구조를 최대한 유지해서 나중에 Thymeleaf 템플릿으로 다시 옮기기 쉽게 둡니다.
- 실제 API 호출, 로그인, 저장 동작은 모두 막고 목업 인터랙션만 유지합니다.
