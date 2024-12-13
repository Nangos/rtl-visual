import React from 'react';
import { InlineMath } from 'react-katex';


const decodeWX = (value) => {
  // sample: "X_{11}"
  //          0  34
  return {
    i: parseInt(value[3]),
    j: parseInt(value[4]),
  }
}

const decodeSum = (value) => {
  // sample: "\\sum_{0}^{1} X_{0i} W_{i0}"
  //           0    5    0    56   0   45
  return {
    count: parseInt(value[10]),
    left: parseInt(value[16]),
    right: parseInt(value[24]),
  }
}

const valueToColor = (value, sizes) => {
  const { arrayWidth, streamLength } = sizes;
  const low = 0.8;
  const high = 1.0;
  const base = 0.7;

  let color = 'white';  // default color
  if (value.startsWith('X')) {
    const { i, j } = decodeWX(value);
    const r = low + (high - low) * i / (arrayWidth - 1);
    const b = low + (high - low) * j / (streamLength - 1);
    const g = base;
    color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  } else if (value.startsWith('W')) {
    const { i, j } = decodeWX(value);
    const g = low + (high - low) * j / (arrayWidth - 1);
    const b = low + (high - low) * i / (streamLength - 1);
    const r = base;
    color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  } else if (value.startsWith('\\sum')) {
    const { left, right } = decodeSum(value);
    const r = low + (high - low) * left / (arrayWidth - 1);
    const g = low + (high - low) * right / (arrayWidth - 1);
    const b = base;
    color = `rgb(${r * 255}, ${g * 255}, ${b * 255})`;
  }
  return color;
}


const ProcessingElement = ({ registers, sizes }) => {
  const isActive = registers.X !== "0" && registers.W !== "0";
  const count = registers.Acc === "0" ? 0 : decodeSum(registers.Acc).count + 1;
  const { streamLength } = sizes;
  return (
    <div className="processing-element" data-active={isActive}>
      <progress value={count} max={streamLength}></progress>
      {Object.entries(registers).map(([name, value]) => (
        <div key={name} className="register">
          {name}: <span style={{ backgroundColor: valueToColor(value, sizes) }}>
            <InlineMath>{value}</InlineMath>
          </span>
        </div>
      ))}
    </div>
  );
};

const SystolicArray = ({ registerMatrix, sizes }) => {
  return (
    <div className="systolic-array">
      {registerMatrix.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((registers, colIndex) => (
            <ProcessingElement key={colIndex} registers={registers} sizes={sizes} />
          ))}
        </div>
      ))}
    </div>
  );
};

const DelayRegisterTriangle = ({ name, registerTriangle, sizes }) => {
  return (
    <div id={name} className="delay-register-triangle">
      {registerTriangle.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((value, colIndex) => (
            <div key={colIndex} className="register">
              <span style={{ backgroundColor: valueToColor(value, sizes) }}>
                <InlineMath>{value}</InlineMath>
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const Memory = ({ name, memoryCells, rowWidth, activeRow, sizes }) => {
  // interpret index as a 2D index:
  //   - row index is index / rowWidth
  //   - column index is index % rowWidth
  // Make a nested div for each row, and a div for each column.
  let rows = [];
  for (let i = 0; i < memoryCells.length; i += rowWidth) {
    let rowIndex = i / rowWidth;
    rows.push(
      <div key={i} className="row">
        {memoryCells.slice(i, i + rowWidth).map((value, j) => (
          <div key={j} className="register" data-activated={rowIndex === activeRow}>
            <span style={{ backgroundColor: valueToColor(value, sizes) }}>
              <InlineMath>{value}</InlineMath>
            </span>
          </div>
        ))}
      </div>
    );
  }
  return <div id={name} className="memory">{rows}</div>;
}

const Controller = ({ cycleCount, controlWires }) => {
  return (
    <div className="controller">
      <div className="cycle-count">Cycle: {cycleCount}</div>
      <div className="control-wires">
        {Object.entries(controlWires).map(([name, value]) => (
          <div key={name} className="control-wire">
            {name}: {value.toString()}
          </div>
        ))}
      </div>
    </div>
  );
}

const TopLevel = ({ json_data }) => {
  const { regs, wires } = json_data;
  const { X_mem, W_mem, Y_mem, X_delay, W_delay, systolicArray, controls } = regs;
  const { cycleCount } = controls;
  const { controlSignals } = wires;
  const row_width = systolicArray.length;

  const rowIndex_X = controlSignals.X_memReadEnable ? controlSignals.X_memReadAddress : null;
  const rowIndex_W = controlSignals.W_memReadEnable ? controlSignals.W_memReadAddress : null;
  const rowIndex_Y = controlSignals.Y_memWriteEnable ? controlSignals.Y_memWriteAddress : null;
  const sizes = {
    arrayWidth: row_width,
    streamLength: X_mem.length / row_width,
  };

  const cols = 3;
  const rows = 4;
  const gridStyle = {
    gridTemplateColumns: `repeat(${cols}, 1fr)`,
    gridTemplateRows: `repeat(${rows}, auto)`,
  };

  return (
    <div className="top-level">
      <div className="grid-container" style={gridStyle}>
        <div style={{ gridRow: 1, gridColumn: 3, justifySelf: 'right' }}>
          <Memory name="W_mem" memoryCells={W_mem} rowWidth={row_width} activeRow={rowIndex_W} sizes={sizes} />
        </div>
        <div style={{ gridRow: 2, gridColumn: 3, justifySelf: 'right' }}>
          <DelayRegisterTriangle name="W_delay" registerTriangle={W_delay} sizes={sizes} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 1, justifySelf: 'right' }}>
          <Memory name="X_mem" memoryCells={X_mem} rowWidth={row_width} activeRow={rowIndex_X} sizes={sizes} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 2, justifySelf: 'right', alignSelf: 'flex-end' }}>
          <DelayRegisterTriangle name="X_delay" registerTriangle={X_delay} sizes={sizes} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 3, justifySelf: 'right' }}>
          <SystolicArray registerMatrix={systolicArray} sizes={sizes} />
        </div>
        <div style={{ gridRow: 4, gridColumn: 3, justifySelf: 'right' }}>
          <Memory name="Y_mem" memoryCells={Y_mem} rowWidth={row_width} activeRow={rowIndex_Y} sizes={sizes} />
        </div>
      </div>
      <Controller cycleCount={cycleCount} controlWires={controlSignals} />
    </div>
  )
}

export default TopLevel;
