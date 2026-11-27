import Map from 'ol/Map';
import View from 'ol/View';
import { defaults as defaultControls } from 'ol/control/defaults';
import TileLayer from 'ol/layer/Tile';
import { fromLonLat } from 'ol/proj';
import OSM from 'ol/source/OSM';
import { useEffect, useRef, useState } from 'react';

type Mountain = {
  id: string;
  name: string;
  longitude: number;
  latitude: number;
};

type MountainList =
  { status: 'loading' | 'error' } | { status: 'ready'; mountains: Mountain[] };

const initialCenter = fromLonLat([126.9639, 37.4453]);

function TrailMap({ mountain }: { mountain: Mountain | undefined }) {
  const target = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);

  useEffect(() => {
    if (!target.current) return;

    const mapView = new View({ center: initialCenter, zoom: 13 });
    view.current = mapView;
    const map = new Map({
      target: target.current,
      layers: [new TileLayer({ source: new OSM() })],
      view: mapView,
      controls: defaultControls({ attributionOptions: { collapsible: false } }),
    });

    return () => {
      map.dispose();
      view.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mountain) return;
    view.current?.animate({
      center: fromLonLat([mountain.longitude, mountain.latitude]),
      zoom: 14,
      duration: 300,
    });
  }, [mountain]);

  return (
    <section className="map-shell" aria-label="산행 지도">
      <div
        className="map"
        ref={target}
        role="region"
        aria-label="OpenStreetMap 배경지도"
        tabIndex={0}
      />
    </section>
  );
}

export function App() {
  const [list, setList] = useState<MountainList>({ status: 'loading' });
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    async function loadMountains() {
      try {
        const response = await fetch('/api/mountains', {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Mountain list request failed');
        const mountains: Mountain[] = await response.json();
        if (controller.signal.aborted) return;
        setList({ status: 'ready', mountains });
        setSelectedId(
          (mountains.find(({ id }) => id === 'gwanaksan') ?? mountains[0])
            ?.id ?? '',
        );
      } catch {
        if (!controller.signal.aborted) setList({ status: 'error' });
      }
    }

    void loadMountains();
    return () => controller.abort();
  }, []);

  const mountains = list.status === 'ready' ? list.mountains : [];
  const mountain = mountains.find(({ id }) => id === selectedId);
  const status = {
    loading: '산 목록을 불러오는 중입니다.',
    error: '산 목록을 불러오지 못했습니다.',
    ready: mountains.length === 0 ? '등록된 산이 없습니다.' : '',
  }[list.status];

  return (
    <main className="workspace">
      <header className="masthead">
        <span className="wordmark">RidgeLens</span>
        <span className="subtitle">사계절 등산로 안내</span>
      </header>
      <aside className="sidebar" aria-label="산행 설정">
        <h1>산행 지도</h1>
        <div className="field">
          <label htmlFor="mountain">산</label>
          <div className="select-wrap">
            <select
              id="mountain"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              disabled={mountains.length === 0}
              aria-describedby="mountain-status"
            >
              {mountains.length === 0 && <option value="">산 선택</option>}
              {mountains.map(({ id, name }) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="status" id="mountain-status" role="status">
            {status}
          </div>
        </div>
        <div className="field">
          <label htmlFor="hike-time">산행 일시</label>
          <input id="hike-time" type="datetime-local" />
        </div>
      </aside>
      <TrailMap mountain={mountain} />
    </main>
  );
}
