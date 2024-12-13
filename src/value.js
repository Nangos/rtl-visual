/**
 * Abstract class for a value in the hardware simulation.
 * This value can be symbolic or concrete, depending on your needs.
 * @abstract
 */
export class Value {
  constructor() {
    if (new.target === Value) {
      throw new TypeError("Cannot construct Value instances directly");
    }
  }

  /**
   * @abstract
   * @returns {string} A string representation of the value. (For debugging)
   */
  toString() {
    throw new Error("Cannot call toString on abstract Value class");
  }

  /**
   * @abstract
   * @returns {React.ReactNode} A React node representing the value.
   */
  toReactNode() {
    throw new Error("Cannot call toReactNode on abstract Value class");
  }
}


/**
 * Represents a constant integer value.
 */
export class ConstantInteger extends Value {
  /**
   * @param {number} value 
   */
  constructor(value) {
    super();
    this.value = value;
  }

  toString() {
    // return `${this.value}`;
    return `${this.value}`;
  }

  isZero() {
    return this.value === 0;
  }
}

/**
 * @param {Value} value
 */
export function isConstantZero(value) {
  return value instanceof ConstantInteger && value.isZero();
}

/**
 * Represents a symbolic matrix element, like A[i][j].
 */
export class SymbolicMatrixElement extends Value {
  /**
   * @param {string} matrixName 
   * @param {number} i
   * @param {number} j
   */
  constructor(matrixName, i, j) {
    super();
    this.matrixName = matrixName;
    this.i = i;
    this.j = j;
  }

  toString() {
    // return `${this.matrixName}[${this.i}][${this.j}]`;
    return `${this.matrixName}_{${this.i}${this.j}}`;
  }
}


/**
 * Represents a symbolic partial sum, like $\sum_{k=0}^{N-1} A[i][k] * B[k][j].$
 * Here k is the reduction variable.
 */
export class SymbolicPartialSum extends Value {
  /**
   * @param {string} leftMatrixName
   * @param {string} rightMatrixName
   * @param {number} i
   * @param {number} j
   * @param {number} N
   */
  constructor(leftMatrixName, rightMatrixName, i, j, N) {
    super();
    this.leftMatrixName = leftMatrixName;
    this.rightMatrixName = rightMatrixName;
    this.i = i;
    this.j = j;
    this.N = N;
  }

  toString() {
    // return `Σ_{k=0}^{${this.N - 1}} ${this.leftMatrixName}[${this.i}][k] * ${this.rightMatrixName}[k][${this.j}]`;
    return `\\sum_{0}^{${this.N - 1}} ${this.leftMatrixName}_{${this.i}i} ${this.rightMatrixName}_{i${this.j}}`;
  }
}