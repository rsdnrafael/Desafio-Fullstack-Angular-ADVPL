import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { TarefasListComponent } from './pages/tarefas/tarefas-list/tarefas-list.component';
import { TarefasFormComponent } from './pages/tarefas/tarefas-form/tarefas-form.component';

const routes: Routes = [
  { path: '',               redirectTo: '/tarefas', pathMatch: 'full' },
  { path: 'tarefas',        component: TarefasListComponent },
  { path: 'tarefas/novo',   component: TarefasFormComponent },
  { path: 'tarefas/:pk',    component: TarefasFormComponent }, // pk já vem em Base64 do FWModel
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}