// Interfces que espelham exatamente os campos do SX3

export type Situacao = '1' | '2' | '3' | '4';

export interface ZZGMaster {
  ZZG_FILIAL: string;
  ZZG_CODIGO: string;
  ZZG_TITULO: string;
  ZZG_DESCRI: string;
  ZZG_SITUAC: Situacao;
  ZZG_USUINC: string;
  ZZG_DTINC:  string;
  ZZG_DTCONC: string;
}

export interface ZZHDetail {
  ZZH_FILIAL:  string;
  ZZH_CODIGO:  string;
  ZZH_CODTAR:  string;
  ZZH_DESCRI:  string;
  ZZH_RESPON:  string;
  ZZH_STATUS:  Situacao;
  ZZH_DTCONC:  string;
  deleted?: boolean; // linha marcada para exclusão antes de salvar
}

// Formato que o FWModel devolve no GET lista
export interface FwModelListItem {
  pk: string;
  ZZGMASTER: ZZGMaster;
}

export interface FwModelListResponse {
  total:   number;
  hasNext: boolean;
  items:   FwModelListItem[];
}

// Formato do GET individual
export interface FwModelDetailResponse {
  pk:     string;
  models: {
    ZZGMASTER: ZZGMaster;
    ZZHDETAIL: ZZHDetail[];
  };
}

// Payload para POST e PUT
export interface FwModelSavePayload {
  operation: 3 | 4;
  models: {
    ZZGMASTER: Partial<ZZGMaster>;
    ZZHDETAIL: Partial<ZZHDetail>[];
  };
}

export const SITUACAO_OPTIONS = [
  { value: '1', label: 'Pendente'   },
  { value: '2', label: 'Andamento'  },
  { value: '3', label: 'Concluída'  },
  { value: '4', label: 'Cancelada'  },
];

// Labels coloridas
export const SITUACAO_LABELS = [
  { value: '1', label: 'Pendente',  color: 'color-08' },
  { value: '2', label: 'Andamento', color: 'color-10' },
  { value: '3', label: 'Concluída', color: 'color-11' },
  { value: '4', label: 'Cancelada', color: 'color-07' },
];
