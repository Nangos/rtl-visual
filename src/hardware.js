/**
 * Defines the hardware to be simulated and visualized.
 */

import { ConstantInteger, isConstantZero, SymbolicMatrixElement, SymbolicPartialSum } from './value.js';

/**
 * A processing element (PE) in the systolic array.
 * @abstract
 */
class PE {
  constructor() {
    if (new.target === PE) {
      throw new TypeError("Cannot construct PE instances directly");
    }
  }

  /**
   * Initializes the registers in the processing element.
   * @abstract
   */
  initialize() {
    throw new Error("Cannot call initialize on abstract PE class");
  }

  /**
   * Propagates values through the processing element.
   * (i.e. the combinational logic)
   * @param {Object<string, Value>} inValues  input values to the processing element. Only relevant for Meely; can be omitted for Moore.
   * @returns {Object<string, Value>} output values from the processing element.
   */
  propagate(inValues) {
    throw new Error("Cannot call propagate on abstract PE class");
  }

  /**
   * Updates the registers in the processing element.
   * @param {Object<string, Value>} inValues  input values to the processing element.
   */
  update(inValues) {
    throw new Error("Cannot call update on abstract PE class");
  }
}


/**
 * A processing element in "output stationary" mode.
 * 
 * In this mode, both the input matrix and the weight matrix "flow through" the systolic array,
 * while each output matrix element is accumulated in a single PE.
 */
class OutputStationaryPE extends PE {
  /**
   * @typedef {Object} OutputStationaryPE_Registers
   * @property {Value} X  The input register.
   * @property {Value} W  The weight register.
   * @property {Value} Acc  The accumulator register.
   * 
   * @typedef {Object} OutputStationaryPE_Inputs
   * @property {Value} X_in  The wire carrying previous X value.
   * @property {Value} W_in  The wire carrying previous W value.
   * @property {Value} Acc_in  The wire carrying previous Acc value.
   * 
   * @typedef {Object} OutputStationaryPE_Outputs
   * @property {Value} X_out  The wire carrying new X value.
   * @property {Value} W_out  The wire carrying new W value.
   * @property {Value} Acc_out  The wire carrying new Acc value
   */

  constructor() {
    super();

    /**
     * The registers in the processing element.
     * @type {OutputStationaryPE_Registers}
     */
    this.regs = {
      X: new ConstantInteger(0),
      W: new ConstantInteger(0),
      Acc: new ConstantInteger(0),
    }
  }

  /**
   * @returns {OutputStationaryPE_Outputs}
   */
  propagate() {
    return {
      X_out: this.regs.X,
      W_out: this.regs.W,
      Acc_out: this.regs.Acc,
    }
  }

  /**
   * @param {OutputStationaryPE_Inputs} inValues
   */
  update(inValues) {
    let CAREFUL = true;
    let nextAcc = this.regs.Acc;
    if (this.regs.X instanceof SymbolicMatrixElement && this.regs.W instanceof SymbolicMatrixElement) {
      // accumulate (before that, validating the input...)
      let k = this.regs.X.j;
      if (CAREFUL) {
        if (this.regs.X.j !== this.regs.W.i) {  // Assuming X is left matrix, W is right matrix here
          throw new Error(`Invalid input: X=${this.regs.X.toString()}, W=${this.regs.W.toString()}`);
        }
        if (isConstantZero(nextAcc)) {
          if (k !== 0) {
            throw new Error(`Invalid input: k=${k}`);
          }
        } else if (nextAcc instanceof SymbolicPartialSum && nextAcc.N === k) {
          if (nextAcc.leftMatrixName !== this.regs.X.matrixName || nextAcc.rightMatrixName !== this.regs.W.matrixName
              || nextAcc.i !== this.regs.X.i || nextAcc.j !== this.regs.W.j) {
            throw new Error(`Invalid input: Acc=${nextAcc.toString()}, X=${this.regs.X.toString()}, W=${this.regs.W.toString()}`);
          }
        } else {
          throw new Error(`Invalid input: Acc=${nextAcc.toString()}, X=${this.regs.X.toString()}, W=${this.regs.W.toString()}`);
        }
      }
      // validation passed, update nextAcc:
      nextAcc = new SymbolicPartialSum(this.regs.X.matrixName, this.regs.W.matrixName, this.regs.X.i, this.regs.W.j, k + 1);
    } else if (isConstantZero(this.regs.X) || isConstantZero(this.regs.W)) {
      // do nothing
    } else {
      throw new Error(`Invalid input: X=${this.regs.X.toString()}, W=${this.regs.W.toString()}`);
    }

    this.regs = {
      X: inValues.X_in,
      W: inValues.W_in,
      Acc: nextAcc,
    }
  }
}


/**
 * the systolic array in "output stationary" mode.
 */
class OutputStationarySystolicArray {
  /**
   * @typedef {Object} OutputStationarySystolicArray_Controls
   * @property {boolean} movesOutputDown  Whether the output should be moved down.
   */

  /**
   * @param {number} N  The number of rows == columns in the systolic array.
   */
  constructor(N) {
    this.N = N;

    this.array = /** @type {Array<Array<OutputStationaryPE>>} */ (new Array(N));
    for (let i = 0; i < N; i++) {
      this.array[i] = new Array(N);
      for (let j = 0; j < N; j++) {
        this.array[i][j] = new OutputStationaryPE();
      }
    }
  }

  /**
   * produces the output values.
   * @param {OutputStationarySystolicArray_Controls} controls  The control values.
   * @returns {Array<Value>}  The output values.
   */
  produce_output(controls) {
    let output = new Array(this.N);
    if (controls.movesOutputDown) {
      for (let i = 0; i < this.N; i++) {
        output[i] = this.array[this.N - 1][i].regs.Acc;
      }
    } else {
      for (let i = 0; i < this.N; i++) {  // don't care
        output[i] = new ConstantInteger(0);
      }
    }
    return output;
  }

  /**
   * updates the processing elements.
   * @param {Array<Value>} inputs_X 
   * @param {Array<Value>} inputs_W 
   * @param {OutputStationarySystolicArray_Controls} controls 
   */
  update(inputs_X, inputs_W, controls) {
    if (controls.movesOutputDown) {
      for (let j = 0; j < this.N; j++) {
        for (let i = this.N - 1; i > 0; i--) {
          this.array[i][j].regs.Acc = this.array[i - 1][j].regs.Acc;
        }
        this.array[0][j].regs.Acc = new ConstantInteger(0);
      }
    } else {
      for (let i = this.N - 1; i >= 0; i--) {
        for (let j = this.N - 1; j >= 0; j--) {
          this.array[i][j].update({
            X_in: j === 0 ? inputs_X[i] : this.array[i][j - 1].regs.X,
            W_in: i === 0 ? inputs_W[j] : this.array[i - 1][j].regs.W,
          });
        }
      }
    }
  }
}


/**
 * A group of delay registers consisting of a triangle of registers of size N, arranged as follows:
 * ```
 *          x0                                   y0 == x0
 *   input  x1  [0][0]                  output   y1
 *  ------> x2  [1][0]  [1][1]         ------->  y2
 *          x3  [2][0]  [2][1]  [2][2]           y3
 *          ...
 * ```
 */
class DelayRegisterTriangle {
  /**
   * @param {number} N  The number of rows == columns in the triangle.
   */
  constructor(N) {
    this.N = N;
    this.registers = /** @type {Array<Array<Value>} */ (new Array(N));
    for (let i = 0; i < N; i++) {
      this.registers[i] = new Array(i);
      for (let j = 0; j <= i; j++) {
        this.registers[i][j] = new ConstantInteger(0);
      }
    }
  }

  /**
   * produces the output values.
   * @param {Array<Value>} input  The input values.
   * @returns {Array<Value>}  The output values.
   */
  produce_output(input) {
    if (input.length !== this.N + 1) {
      throw new Error(`Invalid input length: ${input.length} for the delay register triangle of size ${this.N}`);
    }
    let output = new Array(this.N + 1);
    output[0] = input[0];
    for (let i = 1; i <= this.N; i++) {
      output[i] = this.registers[i - 1][i - 1];
    }
    return output;
  }

  /**
   * updates the registers.
   * @param {Array<Value>} input  The input values.
   */
  update(input) {
    if (input.length !== this.N + 1) {
      throw new Error(`Invalid input length: ${input.length} for the delay register triangle of size ${this.N}`);
    }
    for (let i = 0; i < this.N; i++) {
      for (let j = i; j > 0; j--) {
        this.registers[i][j] = this.registers[i][j - 1];
      }
      this.registers[i][0] = input[i + 1];
    }
  }
}


/**
 * A random access memory (RAM) capable of reading/writing one row at a time.
 */
class MatrixRAM {
  /**
   * @param {number} row_count  The number of rows in the matrix.
   * @param {number} col_count  The number of columns in the matrix.
   * @param {Value} first_value  The value at [0][0] (used as a template to generate rest of the matrix) (hacky!!).
   * @param {boolean} transposed  Whether the matrix is transposed.
   */
  constructor(row_count, col_count, first_value, transposed) {
    this.row_count = row_count;
    this.col_count = col_count;
    this.cells = /** @type {Array<Value>} */ (new Array(row_count * col_count));
    if (first_value instanceof ConstantInteger) {  // fill with the same value
      for (let i = 0; i < row_count * col_count; i++) {
        this.cells[i] = first_value;
      }
    } else if (first_value instanceof SymbolicMatrixElement) {
      let name = first_value.matrixName;
      for (let i = 0; i < row_count; i++) {
        for (let j = 0; j < col_count; j++) {
          this.cells[i * col_count + j] = transposed ? new SymbolicMatrixElement(name, j, i) : new SymbolicMatrixElement(name, i, j);
        }
      }
    } else {
      throw new Error(`Invalid first value: ${first_value}`);
    }
  }

  _checkPosition(row_index, col_offset, element_count) {
    if (row_index < 0 || row_index >= this.row_count) {
      throw new Error(`Invalid row index: ${row_index}`);
    }
    if (col_offset < 0 || col_offset + element_count > this.col_count) {
      throw new Error(`Invalid column offset: ${col_offset} with element count: ${element_count}`);
    }
  }

  /**
   * Reads matrix[row_index][col_offset : col_offset+element_count].
   * @param {number} row_index
   * @param {number} col_offset
   * @param {number} element_count
   * @returns {Array<Value>}  The row at the given index.
   */
  readRow(row_index, col_offset, element_count) {
    this._checkPosition(row_index, col_offset, element_count);

    let start = row_index * this.col_count + col_offset;
    return this.cells.slice(start, start + element_count);
  }

  /**
   * Writes matrix[row_index][col_offset : col_offset+element_count].
   * @param {number} row_index
   * @param {number} col_offset
   * @param {number} element_count
   * @param {Array<Value>} row  The new row to write at the given index.
   */
  writeRow(row_index, col_offset, element_count, row) {
    this._checkPosition(row_index, col_offset, element_count);

    let start = row_index * this.col_count + col_offset;
    for (let i = 0; i < element_count; i++) {
      this.cells[start + i] = row[i];
    }
  }
}


/**
 * Provide control signals (including address signals) for the output-stationary systolic array design.
 */
class OutputStationaryController {
  /**
   * @typedef {Object} AllControls
   * 
   * @property {boolean} X_memReadEnable  Whether to enable reading from the X memory.
   * @property {number} X_memReadAddress  The address to read from the X memory.
   * @property {boolean} W_memReadEnable  Whether to enable reading from the W memory.
   * @property {number} W_memReadAddress  The address to read from the W memory.
   * @property {boolean} Y_memWriteEnable  Whether to enable writing to the Y memory.
   * @property {number} Y_memWriteAddress  The address to write to the Y memory.
   * 
   * @property {boolean} movesOutputDown  Whether the output should be moved down.
   */

  /**
   * @param {number} arrayWidth  The number of rows == columns in the systolic array.
   * @param {number} streamLength  The length of the "stream" (See OutputStationaryTopLevel).
   */
  constructor(arrayWidth, streamLength) {
    this.arrayWidth = arrayWidth;
    this.streamLength = streamLength;

    this.cycleCount = 0;
  }

  /**
   * @returns {AllControls}  All control signals for the design.
   */
  produceControlSignals() {
    let completeCycle = (2 * this.arrayWidth - 1) + this.streamLength;
    return {
      X_memReadEnable: this.cycleCount < this.streamLength,
      X_memReadAddress: this.cycleCount,
      W_memReadEnable: this.cycleCount < this.streamLength,
      W_memReadAddress: this.cycleCount,
      Y_memWriteEnable: this.cycleCount >= completeCycle && this.cycleCount < completeCycle + this.arrayWidth,
      Y_memWriteAddress: (this.arrayWidth - 1) - (this.cycleCount - completeCycle),
      movesOutputDown: this.cycleCount >= completeCycle,
    }
  }

  /**
   * Updates the internal state of the controller.
   */
  update() {
    this.cycleCount++;
  }
}


/**
 * Top-level design for the output-stationary systolic array. Calculates matrix multiplication Y = X W.
 */
class OutputStationaryTopLevel {
  /**
   * @param {number} X_row_count  The number of rows in the input matrix.
   * @param {number} X_col_count  The number of columns in the input matrix.
   * @param {number} W_row_count  The number of rows in the weight matrix.
   * @param {number} W_col_count  The number of columns in the weight matrix.
   * @param {number} systolic_row_count  The number of rows in the systolic array.
   * @param {number} systolic_col_count  The number of columns in the systolic array.
   */
  constructor(X_row_count, X_col_count, W_row_count, W_col_count, systolic_row_count, systolic_col_count) {
    if (X_col_count !== W_row_count) {
      throw new Error(`Invalid input: X_col_count=${X_col_count} does not match W_row_count=${W_row_count}`);
    }
    if (X_row_count !== systolic_row_count || W_col_count !== systolic_col_count) {
      throw new Error(`In current version, systolic array size must match matrix size, will extend functionality in the future`);
    }
    if (systolic_row_count !== systolic_col_count) {
      throw new Error(`In current version, systolic array must be square, will extend functionality in the future`);
    }

    /** The number of rows == number of columns in the systolic array. */
    this.arrayWidth = systolic_row_count;

    /** The number of columns of X == number of rows of W, can be viewed as the length of "input stream" for the systolic array. */
    this.streamLength = X_col_count;

    this.submodules = {
      X_mem: new MatrixRAM(X_col_count, X_row_count, new SymbolicMatrixElement("X", 0, 0), true),
      W_mem: new MatrixRAM(W_row_count, W_col_count, new SymbolicMatrixElement("W", 0, 0), false),
      Y_mem: new MatrixRAM(this.arrayWidth, this.arrayWidth, new ConstantInteger(0), false),

      X_delay: new DelayRegisterTriangle(this.arrayWidth - 1),
      W_delay: new DelayRegisterTriangle(this.arrayWidth - 1),
      systolicArray: new OutputStationarySystolicArray(this.arrayWidth),

      controller: new OutputStationaryController(this.arrayWidth, this.streamLength),
    }
  }

  update() {
    let controls = this.submodules.controller.produceControlSignals();
    this.submodules.controller.update();

    let X_in = controls.X_memReadEnable ?
      this.submodules.X_mem.readRow(controls.X_memReadAddress, 0, this.arrayWidth) :
      new Array(this.arrayWidth).fill(new ConstantInteger(0));

    let W_in = controls.W_memReadEnable ?
      this.submodules.W_mem.readRow(controls.W_memReadAddress, 0, this.arrayWidth) :
      new Array(this.arrayWidth).fill(new ConstantInteger(0));

    let X_in_delayed = this.submodules.X_delay.produce_output(X_in);
    this.submodules.X_delay.update(X_in);

    let W_in_delayed = this.submodules.W_delay.produce_output(W_in);
    this.submodules.W_delay.update(W_in);

    let Y_out = this.submodules.systolicArray.produce_output({ movesOutputDown: controls.movesOutputDown });
    if (controls.Y_memWriteEnable) {
      this.submodules.Y_mem.writeRow(controls.Y_memWriteAddress, 0, this.arrayWidth, Y_out);
    }
    this.submodules.systolicArray.update(X_in_delayed, W_in_delayed, { movesOutputDown: controls.movesOutputDown });
  }

  /**
   * Dumps the state of the design as a JSON object.
   */
  dump_state() {
    return {
      regs: {
        X_mem: this.submodules.X_mem.cells.map(cell => cell.toString()),
        W_mem: this.submodules.W_mem.cells.map(cell => cell.toString()),
        Y_mem: this.submodules.Y_mem.cells.map(cell => cell.toString()),
        X_delay: this.submodules.X_delay.registers.map(row => row.map(cell => cell.toString())),
        W_delay: this.submodules.W_delay.registers.map(row => row.map(cell => cell.toString())),
        systolicArray: this.submodules.systolicArray.array.map(row => row.map(pe => {
          return {
            X: pe.regs.X.toString(),
            W: pe.regs.W.toString(),
            Acc: pe.regs.Acc.toString(),
          };
        })),
        controls: {
          cycleCount: this.submodules.controller.cycleCount,
        },
      },
      wires: {
        controlSignals: this.submodules.controller.produceControlSignals(),
      }
    }
  }

  /**
   * Simulates the design and obtains the state trace.
   * @param {number} numCycles  The number of cycles to simulate. (If null, calculate a reasonable number of cycles.)
   */
  simulate(numCycles) {
    if (numCycles === null) {
      numCycles = 3 * this.arrayWidth + this.streamLength;
    }
    let states = new Array(numCycles);
    for (let i = 0; i < numCycles; i++) {
      states[i] = this.dump_state();
      this.update();
    }
    return states;
  }
}


export default OutputStationaryTopLevel;