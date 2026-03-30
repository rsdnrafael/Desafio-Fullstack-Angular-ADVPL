export type Situacao = '1' | '2' | '3' | '4';

export interface FwField {
  id:     string;
  order?: number;
  value:  string;
}

export interface FwSubModel {
  id:        string;
  modeltype: string;
  fields?:   FwField[];
  models?:   FwSubModel[]; 
  items?:    FwGridItem[];  // linhas do grid
}

export interface FwGridItem {
  id?:     number;    // id numérico atribuído pelo FWModel a cada linha existente
  deleted: number;    // 0 = ativa, 1 = excluída
  fields:  FwField[];
}

export interface FwResource {
  id:        string;
  operation: number;
  pk:        string;
  models:    FwSubModel[];
}

export interface FwModelListResponse {
  total:      number;
  count:      number;
  startindex: number;
  resources:  FwResource[];
}

export interface ZZGMaster {
  ZZG_FILIAL: string;
  ZZG_CODIGO: string;
  ZZG_TITULO: string;
  ZZG_DESCRI: string;
  ZZG_SITUAC: Situacao;
  ZZG_USUINC: string;
  ZZG_DTINC:  Date | null;
  ZZG_DTCONC: Date | null;
  pk?:        string;
}

export interface ZZHDetail {
  ZZH_FILIAL:  string;
  ZZH_CODIGO:  string;
  ZZH_CODTAR:  string;
  ZZH_DESCRI:  string;
  ZZH_RESPON:  string;
  ZZH_STATUS:  Situacao;
  ZZH_DTCONC:  Date | null;
  deleted?:    boolean;
  _fwItemId?:  number; // id numérico que o FWModel atribui — necessário para identificar linhas no PUT
}

export const SITUACAO_OPTIONS = [
  { value: '1', label: 'Pendente'  },
  { value: '2', label: 'Andamento' },
  { value: '3', label: 'Concluída' },
  { value: '4', label: 'Cancelada' },
];

export const SITUACAO_LABELS = [
  { value: '1', label: 'Pendente',  color: 'color-08' },
  { value: '2', label: 'Andamento', color: 'color-10' },
  { value: '3', label: 'Concluída', color: 'color-11' },
  { value: '4', label: 'Cancelada', color: 'color-07' },
];