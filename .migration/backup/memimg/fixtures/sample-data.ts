/**
 * Sample test data generators and fixtures
 */

/**
 * Creates a simple employee object for testing
 */
export function createEmployee(overrides: Partial<Employee> = {}): Employee {
  return {
    empno: 7369,
    ename: 'SMITH',
    job: 'CLERK',
    mgr: 7902,
    hiredate: new Date('1980-12-17'),
    sal: 800,
    comm: null,
    deptno: 20,
    ...overrides,
  };
}

/**
 * Creates a department object for testing
 */
export function createDepartment(overrides: Partial<Department> = {}): Department {
  return {
    deptno: 10,
    dname: 'ACCOUNTING',
    loc: 'NEW YORK',
    employees: [],
    ...overrides,
  };
}

/**
 * Creates a complete Scott/Tiger EMP-DEPT dataset
 */
export function createScottData(): ScottData {
  const depts = {
    accounting: {
      deptno: 10,
      dname: 'ACCOUNTING',
      loc: 'NEW YORK',
      employees: [] as Employee[],
    },
    research: {
      deptno: 20,
      dname: 'RESEARCH',
      loc: 'DALLAS',
      employees: [] as Employee[],
    },
    sales: {
      deptno: 30,
      dname: 'SALES',
      loc: 'CHICAGO',
      employees: [] as Employee[],
    },
  };

  const emps = {
    king: createEmployee({
      empno: 7839,
      ename: 'KING',
      job: 'PRESIDENT',
      mgr: null,
      hiredate: new Date('1981-11-17'),
      sal: 5000,
      deptno: 10,
    }),
    blake: createEmployee({
      empno: 7698,
      ename: 'BLAKE',
      job: 'MANAGER',
      mgr: 7839,
      hiredate: new Date('1981-05-01'),
      sal: 2850,
      deptno: 30,
    }),
    smith: createEmployee({
      empno: 7369,
      ename: 'SMITH',
      job: 'CLERK',
      mgr: 7902,
      hiredate: new Date('1980-12-17'),
      sal: 800,
      deptno: 20,
    }),
  };

  depts.accounting.employees.push(emps.king);
  depts.sales.employees.push(emps.blake);
  depts.research.employees.push(emps.smith);

  return { depts, emps };
}

/**
 * Creates an object graph with circular references
 */
export function createCircularGraph() {
  const emp: any = { empno: 7369, ename: 'SMITH' };
  const dept: any = { deptno: 20, dname: 'RESEARCH' };

  emp.dept = dept;
  dept.employees = [emp];
  dept.manager = emp;

  return { emp, dept };
}

/**
 * Creates a deeply nested object for testing path traversal
 */
export function createDeepNested(depth: number = 5): Record<string, any> {
  let current: Record<string, any> = { value: 'leaf' };

  for (let i = depth - 1; i >= 0; i--) {
    current = { [`level${i}`]: current };
  }

  return current;
}

/**
 * Creates an object with all JavaScript primitive types
 */
export function createAllTypes() {
  return {
    string: 'hello',
    number: 42,
    boolean: true,
    null: null,
    undefined: undefined,
    bigint: BigInt(9007199254740991),
    symbol: Symbol('test'),
    date: new Date('2024-01-01'),
    array: [1, 2, 3],
    object: { nested: 'value' },
    map: new Map([['key', 'value']]),
    set: new Set([1, 2, 3]),
    func: function testFunc() { return 'result'; },
  };
}

/**
 * Creates a large dataset for performance testing
 */
export function createLargeDataset(size: number = 1000) {
  const employees: Employee[] = [];

  for (let i = 0; i < size; i++) {
    employees.push(createEmployee({
      empno: 7000 + i,
      ename: `EMP${i}`,
      sal: 1000 + (i * 10),
    }));
  }

  return { employees };
}

/**
 * Creates collection test data
 */
export function createCollectionData() {
  return {
    array: [1, 2, 3, 4, 5],
    map: new Map([
      ['a', 1],
      ['b', 2],
      ['c', 3],
    ]),
    set: new Set(['x', 'y', 'z']),
    nestedArray: [[1, 2], [3, 4]],
    nestedMap: new Map([
      ['outer', new Map([['inner', 'value']])],
    ]),
  };
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface Employee {
  empno: number;
  ename: string;
  job: string;
  mgr: number | null;
  hiredate: Date;
  sal: number;
  comm: number | null;
  deptno: number;
}

export interface Department {
  deptno: number;
  dname: string;
  loc: string;
  employees: Employee[];
}

export interface ScottData {
  depts: {
    accounting: Department;
    research: Department;
    sales: Department;
  };
  emps: {
    king: Employee;
    blake: Employee;
    smith: Employee;
  };
}
