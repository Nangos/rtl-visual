import React, { useState, useEffect } from 'react';
import OutputStationaryTopLevel from './hardware.js';
import TopLevel from './hardwareRender.js';

const SimulationPanel = () => {
  const defaultArrayWidth = 2;
  const defaultStreamLength = 3;
  const playSpeed = 500;  // ms per cycle

  const [arrayWidth, setArrayWidth] = useState(defaultArrayWidth);
  const [streamLength, setStreamLength] = useState(defaultStreamLength);
  const [jsonData, setJsonData] = useState([]);
  const [currentCycle, setCurrentCycle] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [intervalId, setIntervalId] = useState(null);

  const simulate = () => {
    const module = new OutputStationaryTopLevel(
      arrayWidth, streamLength, streamLength, arrayWidth, arrayWidth, arrayWidth);
    const result = module.simulate(null);
    setJsonData(result);
    setCurrentCycle(0);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      clearInterval(intervalId);
      setIsPlaying(false);
    } else {
      const id = setInterval(() => {
        setCurrentCycle((prev) => Math.min(prev + 1, jsonData.length - 1));
      }, playSpeed);
      setIntervalId(id);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (currentCycle === jsonData.length - 1) {
      clearInterval(intervalId);
      setIsPlaying(false);
    }
  }, [currentCycle, jsonData.length, intervalId]);

  return (
    <div className="simulation-panel">
      <div id="left-panel">
        <div className="controls">
          <h2>Systolic Array Simulator</h2>
          <div className="input-group">
            <label htmlFor="arrayWidth">Array Width:</label>
            <input
              id="arrayWidth" type="number" value={arrayWidth} min={2} max={8}
              onChange={(e) => setArrayWidth(Number(e.target.value))}
            />
          </div>
          <div className="input-group">
            <label htmlFor="streamLength">Stream Length:</label>
            <input
              id="streamLength" type="number" value={streamLength} min={2} max={8}
              onChange={(e) => setStreamLength(Number(e.target.value))}
            />
          </div>
          <button onClick={simulate}>Simulate</button>
        </div>

        { jsonData.length > 0 ?
          (
            <div className="cycle-controls">
              <div>
                <button onClick={() => setCurrentCycle(0)}>Begin</button>
                <button onClick={() => setCurrentCycle((prev) => Math.max(prev - 1, 0))}>Prev</button>
                <input
                  type="range"
                  min="0"
                  max={jsonData.length - 1}
                  value={currentCycle}
                  onChange={(e) => setCurrentCycle(Number(e.target.value))}
                />
                <button onClick={() => setCurrentCycle((prev) => Math.min(prev + 1, jsonData.length - 1))}>Next</button>
                <button onClick={() => setCurrentCycle(jsonData.length - 1)}>End</button>
              </div>
              <button onClick={handlePlayPause}>{isPlaying ? 'Pause' : 'Play'}</button>
            </div>
          ) : null
        }
      </div>

      <div id="right-panel">
        {
          jsonData.length > 0 ?
          (
            <div className="diagram">
              {jsonData.length > 0 && <TopLevel json_data={jsonData[currentCycle]} />}
            </div>
          ) : null
        }
      </div>
    </div>
  );
};

export default SimulationPanel;
