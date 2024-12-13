import React from 'react';
import { InlineMath } from 'react-katex';

const ProcessingElement = ({ registers }) => {
  return (
    <div className="processing-element">
      {Object.entries(registers).map(([name, value]) => (
        <div key={name} className="register">
          {name}: <InlineMath>{value}</InlineMath>
        </div>
      ))}
    </div>
  );
};

const SystolicArray = ({ registerMatrix }) => {
  return (
    <div className="systolic-array">
      {registerMatrix.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((registers, colIndex) => (
            <ProcessingElement key={colIndex} registers={registers} />
          ))}
        </div>
      ))}
    </div>
  );
};

const DelayRegisterTriangle = ({ name, registerTriangle }) => {
  return (
    <div id={name} className="delay-register-triangle">
      {registerTriangle.map((row, rowIndex) => (
        <div key={rowIndex} className="row">
          {row.map((value, colIndex) => (
            <div key={colIndex} className="register">
              <InlineMath>{value}</InlineMath>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const Memory = ({ name, memoryCells, rowWidth }) => {
  // interpret index as a 2D index:
  //   - row index is index / rowWidth
  //   - column index is index % rowWidth
  // Make a nested div for each row, and a div for each column.
  let rows = [];
  for (let i = 0; i < memoryCells.length; i += rowWidth) {
    rows.push(
      <div key={i} className="row">
        {memoryCells.slice(i, i + rowWidth).map((value, j) => (
          <div key={j} className="register">
            <InlineMath>{value}</InlineMath>
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
          <Memory name="W_mem" memoryCells={W_mem} rowWidth={row_width} />
        </div>
        <div style={{ gridRow: 2, gridColumn: 3, justifySelf: 'right' }}>
          <DelayRegisterTriangle name="W_delay" registerTriangle={W_delay} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 1, justifySelf: 'right' }}>
          <Memory name="X_mem" memoryCells={X_mem} rowWidth={row_width} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 2, justifySelf: 'right', alignSelf: 'flex-end' }}>
          <DelayRegisterTriangle name="X_delay" registerTriangle={X_delay} />
        </div>
        <div style={{ gridRow: 3, gridColumn: 3, justifySelf: 'right' }}>
          <SystolicArray registerMatrix={systolicArray} />
        </div>
        <div style={{ gridRow: 4, gridColumn: 3, justifySelf: 'right' }}>
          <Memory name="Y_mem" memoryCells={Y_mem} rowWidth={row_width} />
        </div>
      </div>
      <Controller cycleCount={cycleCount} controlWires={controlSignals} />
    </div>
  )
}

export default TopLevel;
