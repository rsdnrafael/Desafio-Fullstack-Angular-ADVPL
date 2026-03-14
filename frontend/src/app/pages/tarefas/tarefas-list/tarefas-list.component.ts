import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  PoTableColumn,
  PoTableAction,
  PoPageAction,
  PoNotificationService,
  PoDialogService,
  PoPageFilter,
} from '@po-ui/ng-components';

import { TarefasService } from '../../../services/tarefas.service';
import { ZZGMaster, SITUACAO_LABELS } from '../../../models/tarefa.model';

@Component({
  selector: 'app-tarefas-list',
  templateUrl: './tarefas-list.component.html',
})
export class TarefasListComponent implements OnInit {

  tarefas: ZZGMaster[] = [];
  isLoading = false;
  filtro = '';

  colunas: PoTableColumn[] = [
    { property: 'ZZG_CODIGO', label: 'Código',           width: '10%' },
    { property: 'ZZG_TITULO', label: 'Título',            width: '20%' },
    { property: 'ZZG_DESCRI', label: 'Descrição',         width: '28%' },
    { property: 'ZZG_DTINC',  label: 'Data de Criação',   width: '12%', type: 'date', format: 'dd/MM/yyyy' },
    { property: 'ZZG_DTCONC', label: 'Data de Conclusão', width: '12%', type: 'date', format: 'dd/MM/yyyy' },
    {
      property: 'ZZG_SITUAC',
      label: 'Status',
      width: '14%',
      type: 'label',
      labels: SITUACAO_LABELS,
    },
  ];

  acoesPagina: PoPageAction[] = [
    { label: 'Nova tarefa', action: () => this.router.navigate(['/tarefas/novo']), icon: 'po-icon-plus' },
  ];

  // FIX 10: action deve ser Function, não string — inicializado no ngOnInit
  filtroConfig: PoPageFilter = {
    placeholder: 'Pesquisar por título ou descrição',
    action: () => {},
  };

  acoesLinha: PoTableAction[] = [
    { label: 'Editar',  action: (row: ZZGMaster) => this.editar(row) },
    { label: 'Excluir', action: (row: ZZGMaster) => this.confirmarExclusao(row), type: 'danger' },
  ];

  constructor(
    private service: TarefasService,
    private router: Router,
    private notification: PoNotificationService,
    private dialog: PoDialogService,
  ) {}

  ngOnInit(): void {
    // Agora que 'this' está disponível, atribuímos a função corretamente
    this.filtroConfig = {
      placeholder: 'Pesquisar por título ou descrição',
      action: (valor: string) => this.pesquisar(valor),
    };
    this.carregar();
  }

  carregar(): void {
    this.isLoading = true;
    this.service.listar(this.filtro).subscribe({
      next: (res) => {
        this.tarefas = res.items.map(item => item.ZZGMASTER);
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Erro ao carregar tarefas.');
        this.isLoading = false;
      },
    });
  }

  pesquisar(valor: string): void {
    this.filtro = valor;
    this.carregar();
  }

  editar(tarefa: ZZGMaster): void {
    this.router.navigate(['/tarefas', tarefa.ZZG_FILIAL, tarefa.ZZG_CODIGO]);
  }

  confirmarExclusao(tarefa: ZZGMaster): void {
    this.dialog.confirm({
      title:   'Confirme a exclusão da tarefa',
      message: `Você está prestes a excluir a tarefa <strong>${tarefa.ZZG_TITULO}</strong>. Tem certeza que deseja continuar?`,
      confirm: () => this.excluir(tarefa),
    });
  }

  private excluir(tarefa: ZZGMaster): void {
    this.service.excluir(tarefa.ZZG_FILIAL, tarefa.ZZG_CODIGO).subscribe({
      next: () => {
        this.notification.success('Tarefa excluída com sucesso!');
        this.carregar();
      },
      error: (err) => {
        const msg = err?.error?.errorMessage || 'Erro ao excluir tarefa.';
        this.notification.error(msg);
      },
    });
  }
}
