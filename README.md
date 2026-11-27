# RidgeLens · 리지렌즈

RidgeLens는 산행 날짜와 시간대에 맞춰 등산로 구간을 비교하는 **사계절 등산로 안내 서비스**다. 겨울 아침에는 어느 구간의 결빙 가능성이 더 낮은지, 여름 오후에는 어느 구간이 햇볕에 덜 노출되고 상대적으로 덜 더울지를 안내하는 것이 목표다. 봄과 가을에도 산행 시점의 조건에 따라 두 지표를 함께 고려한다.

## 로컬 실행 · Windows PowerShell

Docker Desktop을 Linux 컨테이너 모드로 시작한 뒤 저장소 루트에서 실행한다. `.env`가 이미 있으면 기존 값을 사용한다.

```powershell
if (-not (Test-Path -LiteralPath .env)) { Copy-Item .env.example .env }
docker compose config --quiet
docker compose up --build -d --wait
docker compose ps
```

- 화면은 [http://localhost:5173](http://localhost:5173)에서 열 수 있다. 기본 배경지도는 OpenStreetMap이며, 브라우저에서 타일 서버에 연결할 수 있어야 한다.
- 산 목록은 Vite 프록시를 거쳐 [http://localhost:5173/api/mountains](http://localhost:5173/api/mountains)에서 조회한다. 처음 생성한 DB에는 Flyway가 관악산을 등록한다. 산이 없는 DB에서 API는 `[]`를 반환하며 화면에는 ‘등록된 산이 없습니다.’가 표시된다.
- 산을 추가하려면 `mountains` 테이블에 고유 ID, 표시 이름, WGS84 경도·위도를 등록한다. 화면은 API의 목록을 읽고 선택한 산의 좌표로 이동한다.
- 화면과 API 포트를 변경하려면 `.env`의 `FRONTEND_PORT`를 수정한다. Compose 네트워크의 백엔드와 DB는 내부에서 통신한다.
- Windows에서 `docker` 명령을 찾을 수 없으면 Docker Desktop 설치 경로의 `resources\bin`을 PowerShell의 `$env:Path`에 추가한다.

```powershell
curl.exe -fsS http://localhost:5173/api/mountains
'SELECT PostGIS_Full_Version();' | docker compose exec -T db sh -c 'exec psql -U $POSTGRES_USER -d $POSTGRES_DB -v ON_ERROR_STOP=1'
docker compose down
```

`docker compose down`은 컨테이너와 네트워크를 정리하고 DB 볼륨은 유지한다. 원본 GIS 자료는 Git에서 제외되는 루트 `data/`에 둔다.

### 로컬 검사

호스트에서 직접 검사할 경우 Node.js 22.12 이상인 22.x, `frontend/package.json`에 명시된 pnpm, JDK 17을 사용한다.

```powershell
Push-Location frontend
pnpm install --frozen-lockfile
pnpm lint
pnpm format:check
pnpm typecheck
pnpm build
Pop-Location

Push-Location backend
.\gradlew.bat spotlessCheck build
Pop-Location
```

포맷을 적용하려면 프런트엔드에서 `pnpm format`, 백엔드에서 `.\gradlew.bat spotlessApply`를 실행한다.

이번 로컬 개발 구성에서는 OpenLayers 배경지도, DB에 연결된 산 선택, 산행 일시 입력을 제공한다. 등산로와 NDVI 적재, 결빙과 열 노출 계산은 후속 작업이다.

## 이용 흐름

1. **산 선택** — 첫 화면에서 산을 선택한다. 모든 산을 대상으로 확장할 수 있게 설계하고, 첫 데이터는 관악산으로 준비한다.
2. **산행 시점 선택** — 산행 날짜와 시간대를 선택한다. 같은 산에서도 아침과 오후를 따로 비교할 수 있도록 한다.
3. **등산로 구간 비교** — 지도에서 같은 산의 구간별 예상 결빙 가능성과 열 노출 정도를 비교한다. 예를 들어 초봄의 추운 아침에는 결빙 가능성을, 늦가을의 더운 오후에는 열 노출을 우선 표시한다.
4. **판단 근거 확인** — 구간을 누르면 해당 시간대의 예상 일조, 기상 조건, 사용한 자료의 기준 시각을 확인한다. 비교할 자료가 부족한 구간에는 ‘자료 부족’을 표시한다.

## 첫 구현 범위

산 목록에서 관악산을 선택하면 해당 산의 등산로와 계절별 식생 자료가 지도에 표시된다. 화면과 데이터 조회는 처음부터 산 ID를 기준으로 구성한다. 새 산의 경계, 등산로, 관측 자료를 등록하면 같은 화면에서 선택할 수 있도록 한다.

관악산의 첫 지도에는 산림청 등산로 SHP와 아래 두 Sentinel-2 L2A 기반 NDVI GeoTIFF를 사용한다. 파일의 날짜는 위성 관측일이며, 사용자가 선택하는 산행 일시와 구분해 표시한다.

| 관측일 | 파일 |
| --- | --- |
| 2025-07-10 | `summer_NDVI_2025-07-10.tif` |
| 2026-01-08 | `winter_NDVI_2026-01-08.tif` |

두 영상은 EPSG:32652의 단일 밴드 Float32 자료다. 지도에는 공통 NDVI 범례를 적용하고 결측값(-9999)은 투명하게 표시한다.

## 안내 기능 개발 순서

1. **산 선택과 지도** — React, TypeScript, OpenLayers로 산 선택부터 등산로 구간 선택까지 구현한다. 관악산 데이터로 지도 좌표와 원본 픽셀 값을 검증한다.
2. **산행 시점별 구간 비교** — 지형으로 계산한 시간대별 잠재 일조에 기온, 최근 강수·적설 등 기상 자료를 결합한다. NDVI는 식생을 설명하는 보조 자료로 사용한다. 초기 결과는 구간 간 상대 지표로 제공하고, 결빙 확률(%)은 실제 노면 관측과 비교해 확률값을 검증한 뒤 도입한다. 열 노출 역시 그늘과 기상 조건을 이용한 추정으로 표시한다.
3. **대상 산 및 자료 확대** — 산별 자료를 추가하고, Sentinel-2 L2A 영상의 검색·품질 확인·갱신을 자동화한다. 산행 시점별 안내에는 위성 관측일과 기상 자료의 적용 시간대를 각각 기록한다.
