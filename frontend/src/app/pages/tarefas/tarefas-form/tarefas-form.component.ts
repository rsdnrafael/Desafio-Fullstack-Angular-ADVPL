import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  PoNotificationService,
  PoDialogService,
  PoTableColumn,
  PoTableAction,
  PoModalComponent,
  PoModalAction,
} from '@po-ui/ng-components';

import { TarefasService } from '../../../services/tarefas.service';
import {
  ZZGMaster,
  ZZHDetail,
  FwModelSavePayload,
  SITUACAO_OPTIONS,
  Situacao,
} from '../../../models/tarefa.model';

@Component({
  selector: 'app-tarefas-form',
  templateUrl: './tarefas-form.component.html',
})
export class TarefasFormComponent implements OnInit {

  @ViewChild('modalSubtarefa', { static: true }) modalSubtarefa!: PoModalComponent;
  @ViewChild('modalExcluirSub', { static: true }) modalExcluirSub!: PoModalComponent;

  isEdit    = false;
  isLoading = false;

  // Dados do formulário principal
  tarefa: Partial<ZZGMaster> = {
    ZZG_TITULO: '',
    ZZG_DESCRI: '',
    ZZG_SITUAC: '1',
    ZZG_DTINC:  '',
    ZZG_DTCONC: '',
  };

  subtarefas: ZZHDetail[] = [];

  // Estado do modal de subtarefa
  subEmEdicao: Partial<ZZHDetail> = {};
  subIndexEdicao = -1; // -1 = nova
  subParaExcluir: ZZHDetail | null = null;

  situacaoOptions = SITUACAO_OPTIONS;

  colunasSubtarefas: PoTableColumn[] = [
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
    { label: 'Editar',  action: (row: ZZHDetail) => this.abrirEdicaoSub(row)  },
    { label: 'Excluir', action: (row: ZZHDetail) => this.confirmarExcluirSub(row), type: 'danger' },
  ];

  // Ações dos modais
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

  get tituloPagina(): string {
    return this.isEdit
      ? `Editando tarefa: ${this.tarefa.ZZG_TITULO}`
      : 'Cadastro de Tarefa';
  }

  get tituloModalSub(): string {
    return this.subIndexEdicao === -1 ? 'Adicionar Subtarefa' : 'Editar Subtarefa';
  }

  // Subtarefas que não foram marcadas para exclusão
  get subAtivas(): ZZHDetail[] {
    return this.subtarefas.filter(s => !s.deleted);
  }

  constructor(
    private service: TarefasService,
    private route: ActivatedRoute,
    private router: Router,
    private notification: PoNotificationService,
    private dialog: PoDialogService,
  ) {}

  ngOnInit(): void {
    const filial = this.route.snapshot.paramMap.get('filial');
    const codigo = this.route.snapshot.paramMap.get('codigo');

    if (filial && codigo) {
      this.isEdit = true;
      this.carregar(filial, codigo);
    }
  }

  carregar(filial: string, codigo: string): void {
    this.isLoading = true;
    this.service.buscar(filial, codigo).subscribe({
      next: (res) => {
        this.tarefa     = { ...res.models.ZZGMASTER };
        this.subtarefas = res.models.ZZHDETAIL ?? [];
        this.isLoading  = false;
      },
      error: () => {
        this.notification.error('Erro ao carregar tarefa.');
        this.isLoading = false;
      },
    });
  }

  salvar(): void {
    if (!this.validar()) return;

    const payload: FwModelSavePayload = {
      operation: this.isEdit ? 4 : 3,
      models: {
        ZZGMASTER: this.tarefa as ZZGMaster,
        // Envia todas as linhas; o backend sabe o que excluir pelo campo deleted
        ZZHDETAIL: this.subtarefas,
      },
    };

    const op$ = this.isEdit
      ? this.service.alterar(this.tarefa.ZZG_FILIAL!, this.tarefa.ZZG_CODIGO!, payload)
      : this.service.incluir(payload);

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

  // ---------- Validações do lado cliente (espelham as do backend) ----------

  private validar(): boolean {
    if (!this.tarefa.ZZG_TITULO?.trim()) {
      this.notification.warning('O título da tarefa é obrigatório.');
      return false;
    }

    if (!this.tarefa.ZZG_DESCRI?.trim()) {
      this.notification.warning('A descrição da tarefa é obrigatória.');
      return false;
    }

    if (this.tarefa.ZZG_DTCONC && this.tarefa.ZZG_DTINC) {
      if (this.tarefa.ZZG_DTCONC < this.tarefa.ZZG_DTINC) {
        this.notification.warning('A data de conclusão não pode ser anterior à data de inclusão.');
        return false;
      }
    }

    // Não permite concluir com subtarefa pendente ou em andamento
    const pendentes = this.subAtivas.filter(s => s.ZZH_STATUS === '1' || s.ZZH_STATUS === '2');
    if (this.tarefa.ZZG_SITUAC === '3' && pendentes.length > 0) {
      this.notification.warning(
        `Não é possível concluir a tarefa. Existem ${pendentes.length} subtarefa(s) pendente(s) ou em andamento.`
      );
      return false;
    }

    // Auto-conclusão: se todas as subtarefas ativas estão concluídas, conclui a tarefa
    if (this.subAtivas.length > 0 && this.subAtivas.every(s => s.ZZH_STATUS === '3')) {
      this.tarefa.ZZG_SITUAC = '3';
    }

    return true;
  }

  // ---------- Modal de Subtarefa ----------

  abrirNovaSubtarefa(): void {
    this.subIndexEdicao = -1;
    this.subEmEdicao = { ZZH_DESCRI: '', ZZH_RESPON: '', ZZH_STATUS: '1', ZZH_DTCONC: '' };
    this.modalSubtarefa.open();
  }

  abrirEdicaoSub(sub: ZZHDetail): void {
    this.subIndexEdicao = this.subtarefas.indexOf(sub);
    this.subEmEdicao = { ...sub };
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

    if (this.subIndexEdicao === -1) {
      this.subtarefas = [...this.subtarefas, this.subEmEdicao as ZZHDetail];
    } else {
      this.subtarefas[this.subIndexEdicao] = this.subEmEdicao as ZZHDetail;
      this.subtarefas = [...this.subtarefas];
    }

    this.modalSubtarefa.close();
  }

  // ---------- Exclusão de Subtarefa ----------

  confirmarExcluirSub(sub: ZZHDetail): void {
    this.subParaExcluir = sub;
    this.modalExcluirSub.open();
  }

  excluirSubtarefa(): void {
    if (!this.subParaExcluir) return;
    // Marca como deletada em vez de remover: o backend precisa saber que a linha foi excluída
    const idx = this.subtarefas.indexOf(this.subParaExcluir);
    if (idx !== -1) {
      this.subtarefas[idx] = { ...this.subtarefas[idx], deleted: true };
      this.subtarefas = [...this.subtarefas];
    }
    this.subParaExcluir = null;
    this.modalExcluirSub.close();
  }
}
