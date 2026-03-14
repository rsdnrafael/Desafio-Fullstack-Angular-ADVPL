import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

import { PoModule } from '@po-ui/ng-components';
import { PoTemplatesModule } from '@po-ui/ng-templates';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { TarefasListComponent } from './pages/tarefas/tarefas-list/tarefas-list.component';
import { TarefasFormComponent } from './pages/tarefas/tarefas-form/tarefas-form.component';
import { RouterModule } from '@angular/router';

@NgModule({
  declarations: [
    AppComponent,
    TarefasListComponent,
    TarefasFormComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    FormsModule,
    AppRoutingModule,
    PoModule,
    PoTemplatesModule,
  ],
  bootstrap: [AppComponent],
})
export class AppModule { }
