declare module "@smallwebco/tinypivot-vue" {
  import type { DefineComponent, Ref, ComputedRef } from "vue";

  export interface PivotFieldInfo {
    field: string;
    type?: string;
  }
  export interface PivotValueField {
    field: string;
    aggregation: string;
  }
  export interface PivotCalculatedField {
    id: string;
    name: string;
    formula: string;
  }

  export const PivotSkeleton: DefineComponent<Record<string, unknown>>;
  export const PivotConfig: DefineComponent<Record<string, unknown>>;

  export function usePivotTable(
    data:
      | Ref<Record<string, unknown>[]>
      | ComputedRef<Record<string, unknown>[]>,
    enableDrillDown: Ref<boolean>,
  ): {
    rowFields: Ref<string[]>;
    columnFields: Ref<string[]>;
    valueFields: Ref<PivotValueField[]>;
    showRowTotals: Ref<boolean>;
    showColumnTotals: Ref<boolean>;
    calculatedFields: Ref<PivotCalculatedField[]>;
    availableFields: ComputedRef<PivotFieldInfo[]>;
    isConfigured: ComputedRef<boolean>;
    pivotResult: ComputedRef<unknown>;
    addRowField: (field: string) => void;
    removeRowField: (field: string) => void;
    addColumnField: (field: string) => void;
    removeColumnField: (field: string) => void;
    addValueField: (field: string, aggregation: string) => void;
    removeValueField: (field: string, aggregation: string) => void;
    updateValueFieldAggregation: (
      field: string,
      oldAgg: string,
      newAgg: string,
    ) => void;
    clearConfig: () => void;
    addCalculatedField: (field: PivotCalculatedField) => void;
    removeCalculatedField: (id: string) => void;
    toggleCollapsedPath: (
      path: unknown,
      arg2: unknown,
      rowFields: string[],
      pivotResult: unknown,
    ) => void;
  };
}
