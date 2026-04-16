import { useState, useEffect, useRef } from 'react';

export default function App() {
  // 1. State for User Inputs
  const [params, setParams] = useState({ sMin: 0, sMax: 40, tMin: 0, tMax: 30 });
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pyodideRef = useRef<any>(null);

  const labelMap: Record<string, string> = {
    sMin: "最小鹽度 (psu)",
    sMax: "最大鹽度 (psu)",
    tMin: "最小溫度 (°C)",
    tMax: "最大溫度 (°C)"
  };

  useEffect(() => {
    async function init() {
      const { loadPyodide, version } = await import('pyodide');
      const py = await loadPyodide({
        indexURL: `https://cdn.jsdelivr.net/pyodide/v${version}/full/`
      });
      await py.loadPackage(["micropip", "numpy", "matplotlib"]);
      const micropip = py.pyimport("micropip");
      await micropip.install("gsw");
      pyodideRef.current = py;
      setLoading(false);
    }
    init();
  }, []);

  const generateImage = async () => {
    const py = pyodideRef.current;

    // Inject React state into Python variables
    py.globals.set("s_min", params.sMin);
    py.globals.set("s_max", params.sMax);
    py.globals.set("t_min", params.tMin);
    py.globals.set("t_max", params.tMax);

    const script = `
import matplotlib.pyplot as plt
import numpy as np
import gsw
import io
import base64

plt.clf()
s_grid, t_grid = np.meshgrid(np.linspace(s_min, s_max, 100),
                             np.linspace(t_min, t_max, 100))
sigma_t = gsw.sigma0(s_grid, t_grid)

plt.figure(figsize=(8, 6))
CS = plt.contour(s_grid, t_grid, sigma_t, colors='gray', linestyles='dashed', levels=15)
plt.clabel(CS, inline=1, fontsize=10, fmt='%.1f')
plt.xlabel('Salinity (psu)\\n')
plt.ylabel('Temperature (°C)')
plt.title('T-S Diagram')
plt.grid(True, alpha=0.3)

buf = io.BytesIO()
plt.savefig(buf, format='png', dpi=150)
buf.seek(0)
"data:image/png;base64," + base64.b64encode(buf.read()).decode('utf-8')
    `;

    const base64Image = await py.runPythonAsync(script);
    setImgSrc(base64Image);
  };

  return (
    <div className="py-10">
      {/* Sidebar: Inputs */}
      <div>
        <h1>溫鹽圖生成器</h1>
        <h2>溫鹽圖參數</h2>

        {Object.entries(params).map(([key, value]) => (
          <div key={key} className="p-0.5">
            <label>{labelMap[key]}</label>
            <input
              type="number"
              value={value}
              onChange={(e) => setParams({...params, [key]: Number(e.target.value)})}
              className="border rounded px-2 py-1 ml-2"
            />
          </div>
        ))}

        <button
          onClick={generateImage}
          disabled={loading}
          className="bg-indigo-600 disabled:bg-gray-500 disabled:text-gray-300 text-white px-4 py-1 rounded mt-4"
        >
          {loading ? "正在載入生成引擎..." : "生成圖表"}
        </button>
      </div>

      {/* Main Area: Image Display */}
      <div className="pt-8">
        {imgSrc ? (
          <>
            <div className="grid place-content-center">
              <img src={imgSrc} alt="T-S Diagram" className="block max-w-[50vw]" />
            </div>
            <div>
              <a
                href={imgSrc}
                download="ts-diagram.png"
                className="text-indigo-500 underline mt-2 inline-block"
              >
                下載圖片
              </a>
            </div>
          </>
        ) : (
          <p className="text-gray-400">配置參數後點擊生成。</p>
        )}
      </div>
    </div>
  );
}
