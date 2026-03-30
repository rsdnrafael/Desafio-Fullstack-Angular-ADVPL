import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, switchMap } from 'rxjs';
import {
  FwModelListResponse,
  FwSubModel,
  FwField,
  ZZGMaster,
  ZZHDetail,
} from '../models/tarefa.model';

@Injectable({ providedIn: 'root' })
export class TarefasService {

  private readonly API     = '/rest/FwModel/ZZTAREFAS';
  private readonly SKIP_DETAIL_NEW = new Set(['pk', 'deleted', '_fwItemId', 'ZZH_CODIGO']);

  
  constructor(private http: HttpClient) {}

  private fieldsToObject(fields: FwField[]): Record<string, string> {
    return fields.reduce((obj, f) => {
      obj[f.id] = f.value;
      return obj;
    }, {} as Record<string, string>);
  }

  parseProtheusDate(value: string | null | undefined): Date | null {
    if (!value || value.length !== 8) return null;
    const y = +value.substring(0, 4);
    const m = +value.substring(4, 6) - 1;
    const d = +value.substring(6, 8);
    if (!y && !m && !d) return null;
    return new Date(y, m, d);
  }

  private toProtheusDate(value: Date | string | null | undefined): string {
    if (!value) return '';
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return value.substring(0, 10).replace(/-/g, '');
    }
    return String(value);
  }

  private serializeValue(key: string, value: unknown): string {
    if (value === null || value === undefined) return '';
    if (key.endsWith('_DTINC') || key.endsWith('_DTCONC')) {
      return this.toProtheusDate(value as Date | string | null);
    }
    if (value instanceof Date) return this.toProtheusDate(value);
    return String(value);
  }

  // Calcula o próximo ZZH_CODIGO com base nas subtarefas já carregadas
  calcularProximoCodigoSub(subtarefas: ZZHDetail[]): string {
    const codigos = subtarefas
      .filter(s => !!s.ZZH_CODIGO)
      .map(s => parseInt(s.ZZH_CODIGO, 10))
      .filter(n => !isNaN(n));
    const max = codigos.length > 0 ? Math.max(...codigos) : 0;
    return String(max + 1).padStart(6, '0');
  }

  // ZZG_CODIGO e ZZG_FILIAL não são enviados
  private readonly SKIP_MASTER = new Set(['pk', 'ZZG_FILIAL', 'ZZG_CODIGO']);

  // ZZH_CODIGO, ZZH_CODTAR são alimentados pelo frontend e enviados 
  private readonly SKIP_DETAIL = new Set(['pk', 'deleted', '_fwItemId']);

  // Ordem dos campos do GRID conforme SX3
  private readonly DETAIL_FIELD_ORDER = [
    'ZZH_FILIAL', 'ZZH_CODIGO', 'ZZH_CODTAR',
    'ZZH_DESCRI', 'ZZH_RESPON', 'ZZH_STATUS', 'ZZH_DTCONC',
  ];

  private toFwFieldsMaster(obj: Partial<ZZGMaster>): FwField[] {
    return Object.entries(obj)
      .filter(([key]) => !this.SKIP_MASTER.has(key))
      .map(([id, value], index) => ({
        id,
        order: index + 1,
        value: this.serializeValue(id, value),
      }));
  }

  private toFwFieldsGrid(obj: Partial<ZZHDetail>): { id: string; value: string }[] {
    return Object.entries(obj)
      .filter(([key]) => !this.SKIP_DETAIL.has(key))
      .map(([id, value]) => ({ id, value: this.serializeValue(id, value) }));
  }


buildPayload(
  tarefa: Partial<ZZGMaster>,
  subtarefas: ZZHDetail[],
  pk?: string,
): object {
  const masterFields = this.toFwFieldsMaster(tarefa);

  // Calcula o maior id existente no grid para sequenciar linhas novas
  let maxFwId = subtarefas
    .filter(s => s._fwItemId !== undefined)
    .reduce((max, s) => Math.max(max, s._fwItemId!), 0);

  const detailItems = subtarefas.map(sub => {
    const isNovaLinha = sub._fwItemId === undefined;

    const subComFK: Partial<ZZHDetail> = {
      ...sub,
      ZZH_FILIAL: tarefa.ZZG_FILIAL ?? '01',
      ZZH_CODTAR: tarefa.ZZG_CODIGO ?? '',
    };

    // Monta fields na ordem fixa da SX3
    const fields = this.DETAIL_FIELD_ORDER
      .filter(key => key in subComFK)
      .map(id => ({
        id,
        value: this.serializeValue(id, (subComFK as any)[id]),
      }));

    // FWModel exige "id" em todos os itens do GRID — inclusive novos
    const item: Record<string, unknown> = {
      deleted: sub.deleted ? 1 : 0,
      fields,
      id: isNovaLinha ? ++maxFwId : sub._fwItemId,
    };

    return item;
  });

  const modelsBlock = [{
    id:        'ZZGMASTER',
    modeltype: 'FIELDS',
    fields:    masterFields,
    models: [{
      id:        'ZZHDETAIL',
      modeltype: 'GRID',
      items:     detailItems,
    }],
  }];

  const payload = pk
    ? { id: 'MZZTAREFAS', operation: 1, pk, models: modelsBlock }
    : { id: 'MZZTAREFAS', operation: 3,     models: modelsBlock };

  console.log('PAYLOAD ENVIADO:', JSON.stringify(payload, null, 2));
  return payload;
}


  listar(filtro?: string): Observable<ZZGMaster[]> {
    let params = new HttpParams();
    if (filtro?.trim()) params = params.set('search', filtro.trim());
    return this.http.get<FwModelListResponse>(this.API, { params }).pipe(
      map(res => (res.resources ?? []).map(r => {
        const master = (r.models ?? []).find((m: FwSubModel) => m.id === 'ZZGMASTER');
        const f = master?.fields ? this.fieldsToObject(master.fields) : {};
        return { ...f, pk: r.pk } as ZZGMaster;
      }))
    );
  }

  buscar(pk: string): Observable<{ tarefa: ZZGMaster; subtarefas: ZZHDetail[] }> {
    return this.http.get<any>(`${this.API}/${pk}`).pipe(
      map(resource => {
        const masterModel = (resource.models ?? []).find((m: any) => m.id === 'ZZGMASTER');
        const detailModel = (masterModel?.models ?? []).find((m: any) => m.id === 'ZZHDETAIL');
        const f = masterModel?.fields ? this.fieldsToObject(masterModel.fields) : {};

        const tarefa: ZZGMaster = {
          ...f,
          pk:         resource.pk,
          ZZG_DTINC:  this.parseProtheusDate(f['ZZG_DTINC']),
          ZZG_DTCONC: this.parseProtheusDate(f['ZZG_DTCONC']),
        } as ZZGMaster;

        const subtarefas: ZZHDetail[] = (detailModel?.items ?? []).map((item: any) => {
          const sf = this.fieldsToObject(item.fields);
          return {
            ...sf,
            ZZH_DTCONC: this.parseProtheusDate(sf['ZZH_DTCONC']),
            _fwItemId:  typeof item.id === 'number' ? item.id : undefined,
          } as ZZHDetail;
        });

        return { tarefa, subtarefas };
      })
    );
  }

  incluir(tarefa: Partial<ZZGMaster>, subtarefas: ZZHDetail[]): Observable<any> {
    return this.http.post(this.API, this.buildPayload(tarefa, subtarefas));
  }

  alterar(pk: string, tarefa: Partial<ZZGMaster>, subtarefas: ZZHDetail[]): Observable<any> {
    return this.http.put(`${this.API}/${pk}`, this.buildPayload(tarefa, subtarefas, pk));
  }

  excluir(pk: string): Observable<any> {
    return this.http.delete(`${this.API}/${pk}`);
  }
}