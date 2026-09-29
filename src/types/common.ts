export type ActionResult<T = undefined> =
  | { success: true; message: string; data?: T }
  | { success: false; message: string; fieldErrors?: Record<string, string[]> };

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
}

export interface ChartDatum {
  label: string;
  value: number;
}
