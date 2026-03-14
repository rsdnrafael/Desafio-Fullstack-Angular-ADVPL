#Include 'Protheus.ch'
#Include 'FWMVCDEF.ch'

// Expoe o modelo como API REST: /rest/FwModel/ZZTAREFAS
PUBLISH MODEL REST NAME ZZTAREFAS

/*
    Gerenciador de Tarefas
    Rotina MVC para cadastro de Tarefas (ZZG) e SubTarefas (ZZH).
    Funciona tanto pelo Protheus quanto via REST (FWModel).
*/
User Function ZZTAREFAS()
    Local oBrowse

    CHKFILE('ZZG')
    CHKFILE('ZZH')

    oBrowse := FWMBrowse():New()
    oBrowse:SetAlias('ZZG')
    oBrowse:SetDescription('Gerenciador de Tarefas')

    oBrowse:AddLegend("ZZG_SITUAC == '1'", 'YELLOW', 'Pendente'    )
    oBrowse:AddLegend("ZZG_SITUAC == '2'", 'BLUE',   'Em Andamento')
    oBrowse:AddLegend("ZZG_SITUAC == '3'", 'GREEN',  'Concluida'   )
    oBrowse:AddLegend("ZZG_SITUAC == '4'", 'RED',    'Cancelada'   )

    oBrowse:Activate()

Return NIL

Static Function MenuDef()
    Local aMenu := FwMvcMenu('ZZTAREFAS')
Return aMenu

Static Function ModelDef()
    Local oModel
    Local oStruZZG := FWFormStruct(1, 'ZZG')
    Local oStruZZH := FWFormStruct(1, 'ZZH')

    oModel := MPFormModel():New('MZZTAREFAS',;
        ,;//{|oModel| TskPreVld(oModel)}, ; // pre-validacao - preenche campos automaticos
        {|oModel| TskPosVld(oModel)} ) // pos-validacao - regras de negocio

    oModel:AddFields('ZZGMASTER', , oStruZZG)
    oModel:AddGrid('ZZHDETAIL', 'ZZGMASTER', oStruZZH)

    oModel:SetRelation('ZZHDETAIL', ;
        { {'ZZH_FILIAL', 'ZZG_FILIAL'}, ;
        {'ZZH_CODTAR', 'ZZG_CODIGO'} }, ;
        ZZH->(IndexKey(1)) )

    oModel:SetPrimaryKey({'ZZG_FILIAL', 'ZZG_CODIGO'})
    oModel:GetModel('ZZHDETAIL'):SetOptional(.T.) // subtarefas nao sao obrigatorias

    oModel:SetDescription('Gerenciador de Tarefas')
    oModel:GetModel('ZZGMASTER'):SetDescription('Tarefa')
    oModel:GetModel('ZZHDETAIL'):SetDescription('SubTarefas')

Return oModel


Static Function ViewDef()
    Local oView
    Local oModel   := FWLoadModel('ZZTAREFAS')
    Local oStruZZG := FWFormStruct(2, 'ZZG')
    Local oStruZZH := FWFormStruct(2, 'ZZH')

    oView := FWFormView():New()
    oView:SetModel(oModel)

    // ZZH_CODTAR e gerenciada pelo SetRelation na Model, nao deve aparecer na tela
    oStruZZH:RemoveField('ZZH_CODTAR')

    // Codigos sao somente leitura
    oStruZZG:SetProperty('ZZG_CODIGO', MVC_VIEW_CANCHANGE, .F.)// Preenchido através do controle de numeração
    oStruZZH:SetProperty('ZZH_CODIGO', MVC_VIEW_CANCHANGE, .F.)

    oView:AddField('VIEW_ZZG', oStruZZG, 'ZZGMASTER')
    oView:AddGrid( 'VIEW_ZZH', oStruZZH, 'ZZHDETAIL')

    //oView:AddIncrementField('VIEW_ZZG', 'ZZG_CODIGO')
    oView:AddIncrementField('VIEW_ZZH', 'ZZH_CODIGO')

    oView:CreateHorizontalBox('SUPERIOR',  40)
    oView:CreateHorizontalBox('INFERIOR', 60)

    oView:SetOwnerView('VIEW_ZZG', 'SUPERIOR' )
    oView:SetOwnerView('VIEW_ZZH', 'INFERIOR')

    oView:EnableTitleView('VIEW_ZZG', 'Tarefa'    )
    oView:EnableTitleView('VIEW_ZZH', 'SubTarefas')

Return oView


// Preenche campos automaticos na inclusao e garante a FK das subtarefas em qualquer operacao.
Static Function TskPreVld(oModel)
    Local oGrid    := oModel:GetModel('ZZHDETAIL')
    Local cCodTar  := oModel:GetValue('ZZGMASTER', 'ZZG_CODIGO')
    Local nI       := 0
    Local aSave    := FWSaveRows()

    If oModel:GetOperation() == 3
        oModel:SetValue('ZZGMASTER', 'ZZG_USUINC', cUserName)
        oModel:SetValue('ZZGMASTER', 'ZZG_DTINC',  Date()  )
    EndIf

    // Garante que cada subtarefa aponta para a tarefa correta.
    For nI := 1 To oGrid:Length()
        oGrid:GoLine(nI)
        If ! oGrid:IsDeleted()
            oGrid:SetValue('ZZH_CODTAR', cCodTar)
        EndIf
    Next nI

    FWRestRows(aSave)

Return .T.


// Regras de negocio executadas ao confirmar a operacao.
Static Function TskPosVld(oModel)
    Local lRet       := .T.
    Local oGrid      := oModel:GetModel('ZZHDETAIL')
    Local cSituac    := oModel:GetValue('ZZGMASTER', 'ZZG_SITUAC')
    Local dDtInc     := oModel:GetValue('ZZGMASTER', 'ZZG_DTINC' )
    Local dDtConc    := oModel:GetValue('ZZGMASTER', 'ZZG_DTCONC')
    Local nI         := 0
    Local nAtivas    := 0 // subtarefas que contam - nao canceladas, nao apagadas
    Local nConc      := 0 // subtarefas concluidas
    Local nPendentes := 0 // subtarefas pendentes ou em andamento
    Local aLinhas := FWSaveRows()

    // Data de conclusao nao pode ser anterior a data de inclusao
    If dDtConc != CToD('') .And. dDtInc != CToD('') .And. dDtConc < dDtInc
        Help(,, 'HELP',, 'A data de conclusao nao pode ser anterior a data de incluso.', 1, 0)
        lRet := .F.
    EndIf

    // Percorre o grid contando subtarefas por status
    For nI := 1 To oGrid:Length()
        oGrid:GoLine(nI)
        If oGrid:IsDeleted()
            Loop
        EndIf
        Do Case
        Case oGrid:GetValue('ZZH_STATUS') == '3' // Concluida
            nAtivas++
            nConc++
        Case oGrid:GetValue('ZZH_STATUS') == '4' // Cancelada - nao interfere na conclusao da tarefa
        Otherwise                                 // Pendente ou Em Andamento
            nAtivas++
            nPendentes++
        EndCase
    Next nI

    FWRestRows(aLinhas)

    // Nao permite concluir a tarefa enquanto houver subtarefa pendente ou em andamento
    If lRet .And. cSituac == '3' .And. nPendentes > 0
        Help(,, 'HELP',, ;
            'Nao e possivel concluir a tarefa.' + CRLF + ;
            'Existem ' + AllTrim(Str(nPendentes)) + ' subtarefa(s) pendente(s) ou em andamento.', ;
            1, 0)
        lRet := .F.
    EndIf

    // Se todas as subtarefas ativas foram concluidas, conclui a tarefa automaticamente
    If lRet .And. nAtivas > 0 .And. nConc == nAtivas
        oModel:SetValue('ZZGMASTER', 'ZZG_SITUAC', '3')
    EndIf

Return lRet
