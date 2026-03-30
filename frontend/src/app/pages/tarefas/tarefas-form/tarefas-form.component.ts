import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PoNotificationService,
  PoDialogService,
  PoTableColumn,
  PoTableAction,
  PoModalComponent,
  PoModalAction,
  PoPageAction,
} from '@po-ui/ng-components';

import { TarefasService } from '../../../services/tarefas.service';
import {
  ZZGMaster,
  ZZHDetail,
  SITUACAO_OPTIONS,
} from '../../../models/tarefa.model';

@Component({
  selector: 'app-tarefas-form',
  templateUrl: './tarefas-form.component.html',
})
export class TarefasFormComponent implements OnInit {

  @ViewChild('modalSubtarefa',  { static: true }) modalSubtarefa!:  PoModalComponent;
  @ViewChild('modalExcluirSub', { static: true }) modalExcluirSub!: PoModalComponent;

  isEdit    = false;
  isLoading = false;
  pk        = '';

  tarefa: Partial<ZZGMaster> = {
    ZZG_TITULO: '',
    ZZG_DESCRI: '',
    ZZG_SITUAC: '1',
    ZZG_USUINC: '', 
    ZZG_DTINC:  new Date(),
    ZZG_DTCONC: null,
  };

  subtarefas: ZZHDetail[] = [];
  subAtivas:  ZZHDetail[] = [];

  subEmEdicao:    Partial<ZZHDetail> = {};
  subIndexEdicao  = -1;
  subParaExcluir: ZZHDetail | null = null;

  situacaoOptions = SITUACAO_OPTIONS;

  tituloPagina   = 'Cadastro de Tarefa';
  tituloModalSub = 'Adicionar Subtarefa';

  breadcrumb = {
    items: [
      { label: 'Cadastro de Tarefas', link: '/tarefas' },
      { label: 'Cadastro de Tarefa' },
    ],
  };

  acoesPagina: PoPageAction[] = [
    { label: 'Salvar',   action: () => this.salvar()   },
    { label: 'Cancelar', action: () => this.cancelar() },
  ];

  colunasSubtarefas: PoTableColumn[] = [
    { property: 'ZZH_CODIGO', label: 'Código', width: '10%' },
    { property: 'ZZH_DESCRI', label: 'Descrição',      width: '35%' },
    { property: 'ZZH_RESPON', label: 'Responsável',    width: '25%' },
    {
      property: 'ZZH_STATUS',
      label:    'Status',
      width:    '20%',
      type:     'label',
      labels: [
        { value: '1', label: 'Pendente',  color: 'color-08' },
        { value: '2', label: 'Andamento', color: 'color-10' },
        { value: '3', label: 'Concluída', color: 'color-11' },
        { value: '4', label: 'Cancelada', color: 'color-07' },
      ],
    },
    { property: 'ZZH_DTCONC', label: 'Data Conclusão', width: '20%', type: 'date', format: 'dd/MM/yyyy' },
  ];

  acoesSubtarefa: PoTableAction[] = [
    { label: 'Editar',  action: (row: ZZHDetail) => this.abrirEdicaoSub(row)      },
    { label: 'Excluir', action: (row: ZZHDetail) => this.confirmarExcluirSub(row), type: 'danger' },
  ];

  acaoSalvarSub: PoModalAction = {
    label: 'Salvar',
    action: () => this.salvarSubtarefa(),
  };

  acaoCancelarSub: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalSubtarefa.close(),
  };

  acaoConfirmarExcluirSub: PoModalAction = {
    label: 'Excluir',
    danger: true,
    action: () => this.excluirSubtarefa(),
  };

  acaoCancelarExcluirSub: PoModalAction = {
    label: 'Cancelar',
    action: () => this.modalExcluirSub.close(),
  };

  constructor(
    private service:      TarefasService,
    private route:        ActivatedRoute,
    private router:       Router,
    private notification: PoNotificationService,
    private dialog:       PoDialogService,
  ) {}

  ngOnInit(): void {
    const pk = this.route.snapshot.paramMap.get('pk');
    if (pk) {
      this.isEdit = true;
      this.pk     = pk;
      this.carregar(pk);
    }
    this.atualizarView();
  }

  carregar(pk: string): void {
    this.isLoading = true;
    this.service.buscar(pk).subscribe({
      next: ({ tarefa, subtarefas }) => {
        this.tarefa     = { ...tarefa };
        this.subtarefas = subtarefas;
        this.atualizarView();
        this.isLoading = false;
      },
      error: () => {
        this.notification.error('Erro ao carregar tarefa.');
        this.isLoading = false;
      },
    });
  }

  salvar(): void {
    if (!this.validar()) return;

    const tarefaParaSalvar: Partial<ZZGMaster> = {
      ...this.tarefa,
      // ZZG_DTCONC só pode ser preenchida quando concluída
      ZZG_DTCONC: this.tarefa.ZZG_SITUAC === '3' ? this.tarefa.ZZG_DTCONC : null,
    };

    const op$ = this.isEdit
      ? this.service.alterar(this.pk, tarefaParaSalvar, this.subtarefas)
      : this.service.incluir(tarefaParaSalvar, this.subtarefas);

    this.isLoading = true;
    op$.subscribe({
      next: () => {
        this.notification.success('Tarefa salva com sucesso!');
        this.router.navigate(['/tarefas']);
      },
      error: (err) => {
        const msg = err?.error?.errorMessage || 'Erro ao salvar tarefa.';
        this.notification.error(msg);
        this.isLoading = false;
      },
    });
  }

  cancelar(): void {
    this.router.navigate(['/tarefas']);
  }

  private validar(): boolean {
    if (!this.tarefa.ZZG_TITULO?.trim()) {
      this.notification.warning('O título da tarefa é obrigatório.');
      return false;
    }
    if (!this.tarefa.ZZG_DESCRI?.trim()) {
      this.notification.warning('A descrição da tarefa é obrigatória.');
      return false;
    }
    if (!this.tarefa.ZZG_SITUAC) {
      this.notification.warning('A situação da tarefa é obrigatória.');
      return false;
    }

    // ZZG_USUINC obrigatório
    if (!this.tarefa.ZZG_USUINC?.trim()) {
      this.notification.warning('O usuário de inclusão é obrigatório.');
      return false;
    }

    const dtInc  = this.tarefa.ZZG_DTINC;
    const dtConc = this.tarefa.ZZG_DTCONC;

    // data de conclusão só quando concluída
    if (dtConc && this.tarefa.ZZG_SITUAC !== '3') {
      this.notification.warning('A data de conclusão só pode ser preenchida quando a situação for "Concluída".');
      return false;
    }

    // data de conclusão não pode ser anterior à de inclusão
    if (dtConc && dtInc && dtConc < dtInc) {
      this.notification.warning('A data de conclusão não pode ser anterior à data de inclusão.');
      return false;
    }

    const ativas    = this.subAtivas;
    const pendentes = ativas.filter(s => s.ZZH_STATUS === '1' || s.ZZH_STATUS === '2');

    // Regra 7 do ADVPL: não conclui com subtarefas pendentes
    if (this.tarefa.ZZG_SITUAC === '3' && pendentes.length > 0) {
      this.notification.warning(
        `Não é possível concluir a tarefa. Existem ${pendentes.length} subtarefa(s) pendente(s) ou em andamento.`
      );
      return false;
    }

    // auto-conclusão quando todas as subtarefas estão concluídas
    if (ativas.length > 0 && ativas.every(s => s.ZZH_STATUS === '3')) {
      this.tarefa.ZZG_SITUAC = '3';
    }

    return true;
  }

  private atualizarView(): void {
    this.subAtivas = this.subtarefas.filter(s => !s.deleted);
    this.tituloPagina = this.isEdit
      ? `Editando: ${this.tarefa.ZZG_TITULO}`
      : 'Cadastro de Tarefa';
    this.breadcrumb.items[1].label = this.tituloPagina;
  }

  // Modal de Subtarefa

  abrirNovaSubtarefa(): void {
    this.subIndexEdicao = -1;
    this.tituloModalSub = 'Adicionar Subtarefa';

    const proximoCodigo = this.service.calcularProximoCodigoSub(this.subtarefas);

    this.subEmEdicao = {
      ZZH_CODIGO: proximoCodigo,
      ZZH_DESCRI: '',
      ZZH_RESPON: '',
      ZZH_STATUS: '1',
      ZZH_DTCONC: null,
      // ZZH_CODTAR será preenchido no buildPayload com o valor de ZZG_CODIGO
    };
    this.modalSubtarefa.open();
  }

  abrirEdicaoSub(sub: ZZHDetail): void {
    this.subIndexEdicao = this.subtarefas.indexOf(sub);
    this.tituloModalSub = 'Editar Subtarefa';
    this.subEmEdicao    = { ...sub };
    this.modalSubtarefa.open();
  }

  salvarSubtarefa(): void {
    if (!this.subEmEdicao.ZZH_DESCRI?.trim()) {
      this.notification.warning('A descrição da subtarefa é obrigatória.');
      return;
    }
    if (!this.subEmEdicao.ZZH_RESPON?.trim()) {
      this.notification.warning('O responsável da subtarefa é obrigatório.');
      return;
    }
    if (!this.subEmEdicao.ZZH_STATUS) {
      this.notification.warning('O status da subtarefa é obrigatório.');
      return;
    }

    if (this.subIndexEdicao === -1) {
      this.subtarefas = [...this.subtarefas, this.subEmEdicao as ZZHDetail];
    } else {
      this.subtarefas[this.subIndexEdicao] = this.subEmEdicao as ZZHDetail;
      this.subtarefas = [...this.subtarefas];
    }

    this.atualizarView();
    this.modalSubtarefa.close();
  }

  confirmarExcluirSub(sub: ZZHDetail): void {
    this.subParaExcluir = sub;
    this.modalExcluirSub.open();
  }

  excluirSubtarefa(): void {
    if (!this.subParaExcluir) return;
    const idx = this.subtarefas.indexOf(this.subParaExcluir);
    if (idx !== -1) {
      this.subtarefas[idx] = { ...this.subtarefas[idx], deleted: true };
      this.subtarefas = [...this.subtarefas];
    }
    this.atualizarView();
    this.subParaExcluir = null;
    this.modalExcluirSub.close();
  }
}