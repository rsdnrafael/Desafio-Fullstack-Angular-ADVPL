import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  FwModelListResponse,
  FwModelDetailResponse,
  FwModelSavePayload,
} from '../models/tarefa.model';

@Injectable({ providedIn: 'root' })
export class TarefasService {

  // Endpoint publicado pelo PUBLISH MODEL REST NAME ZZTAREFAS no fonte ADVPL
  private readonly API = '/rest/FwModel/ZZTAREFAS';

  constructor(private http: HttpClient) {}

  // Monta a PK em Base64 que o FWModel espera na URL (filial + código)
  buildPk(filial: string, codigo: string): string {
    return btoa(filial + codigo);
  }

  listar(filtro?: string): Observable<FwModelListResponse> {
    let params = new HttpParams();
    if (filtro?.trim()) {
      params = params.set('search', filtro.trim());
    }
    return this.http.get<FwModelListResponse>(this.API, { params });
  }

  buscar(filial: string, codigo: string): Observable<FwModelDetailResponse> {
    const pk = this.buildPk(filial, codigo);
    return this.http.get<FwModelDetailResponse>(`${this.API}/${pk}`);
  }

  incluir(payload: FwModelSavePayload): Observable<any> {
    return this.http.post(this.API, payload);
  }

  alterar(filial: string, codigo: string, payload: FwModelSavePayload): Observable<any> {
    const pk = this.buildPk(filial, codigo);
    return this.http.put(`${this.API}/${pk}`, payload);
  }

  excluir(filial: string, codigo: string): Observable<any> {
    const pk = this.buildPk(filial, codigo);
    return this.http.delete(`${this.API}/${pk}`);
  }
}
