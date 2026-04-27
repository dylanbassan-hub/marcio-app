// =====================================================
// Tipos TypeScript — espelho do schema Postgres
// Equivalente ao output de: supabase gen types typescript
// =====================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// ---- Enums ----
export type RoleUsuario      = 'admin' | 'recepcionista' | 'barbeiro'
export type OrigemLead       = 'META_ADS' | 'GOOGLE_ADS' | 'INSTAGRAM_ORGANICO' | 'YOUTUBE' | 'INDICACAO' | 'RECORRENTE' | 'OUTRO'
export type StatusAgendamento = 'AGENDADO' | 'CONFIRMADO' | 'REALIZADO' | 'NAO_COMPARECEU' | 'CANCELADO'
export type CodigoServico    = 'APLICACAO' | 'MANUTENCAO'
export type PapelComissao    = 'MARCIO_SALAO' | 'EXECUTOR' | 'RECEPCIONISTA' | 'TRAFEGO'

// ---- Labels legíveis pro UI ----
export const ORIGEM_LABELS: Record<OrigemLead, string> = {
  META_ADS:           'Meta Ads',
  GOOGLE_ADS:         'Google Ads',
  INSTAGRAM_ORGANICO: 'Instagram Orgânico',
  YOUTUBE:            'YouTube',
  INDICACAO:          'Indicação',
  RECORRENTE:         'Recorrente',
  OUTRO:              'Outro',
}

export const STATUS_LABELS: Record<StatusAgendamento, string> = {
  AGENDADO:        'Agendado',
  CONFIRMADO:      'Confirmado',
  REALIZADO:       'Realizado',
  NAO_COMPARECEU:  'Não compareceu',
  CANCELADO:       'Cancelado',
}

export const ORIGENS_PAGAS: OrigemLead[] = ['META_ADS', 'GOOGLE_ADS']

// ---- Database interface (Supabase pattern) ----
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id:                       string
          nome:                     string
          telefone:                 string | null
          role:                     RoleUsuario
          ativo:                    boolean
          comissao_aplicacao_valor:   number   // R$ fixo por aplicação
          comissao_manutencao_valor:  number   // R$ fixo por manutenção
          is_marcio:                boolean
          is_trafego:               boolean
          created_at:               string
          updated_at:               string
        }
        Insert: Omit<Database['public']['Tables']['users']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['users']['Insert']>
      }
      clientes: {
        Row: {
          id:                     number
          nome:                   string
          telefone:               string | null
          instagram:              string | null
          observacoes:            string | null
          origem_primeira_compra: OrigemLead | null
          ativo:                  boolean
          created_at:             string
          updated_at:             string
          created_by:             string | null
        }
        Insert: Omit<Database['public']['Tables']['clientes']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['clientes']['Insert']>
      }
      servicos: {
        Row: {
          id:          number
          nome:        string
          codigo:      CodigoServico
          duracao_min: number
          ativo:       boolean
        }
        Insert: Omit<Database['public']['Tables']['servicos']['Row'], 'id'>
        Update: Partial<Database['public']['Tables']['servicos']['Insert']>
      }
      agendamentos: {
        Row: {
          id:               number
          cliente_id:       number
          servico_id:       number
          executor_id:      string
          recepcionista_id: string | null
          inicio:           string
          fim:              string
          origem:           OrigemLead
          origem_detalhe:   string | null
          status:           StatusAgendamento
          observacoes:      string | null
          valor_protese:    number | null
          valor_servico:    number | null
          pagamento_forma:  string | null
          fechado_at:       string | null
          fechado_by:       string | null
          created_at:       string
          updated_at:       string
        }
        Insert: Omit<Database['public']['Tables']['agendamentos']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['agendamentos']['Insert']>
      }
      comissoes: {
        Row: {
          id:             number
          agendamento_id: number
          user_id:        string
          papel:          PapelComissao
          percentual:     number
          valor_base:     number
          valor:          number
          pago:           boolean
          pago_at:        string | null
          created_at:     string
        }
        Insert: Omit<Database['public']['Tables']['comissoes']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['comissoes']['Insert']>
      }
    }
    Functions: {
      get_my_role:  { Args: Record<never, never>; Returns: string }
      is_admin:     { Args: Record<never, never>; Returns: boolean }
    }
    Enums: {
      role_usuario:       RoleUsuario
      origem_lead:        OrigemLead
      status_agendamento: StatusAgendamento
      codigo_servico:     CodigoServico
      papel_comissao:     PapelComissao
    }
  }
}

// ---- Tipos convenientes ----
export type UserRow          = Database['public']['Tables']['users']['Row']
export type ClienteRow       = Database['public']['Tables']['clientes']['Row']
export type ServicoRow       = Database['public']['Tables']['servicos']['Row']
export type AgendamentoRow   = Database['public']['Tables']['agendamentos']['Row']
export type ComissaoRow      = Database['public']['Tables']['comissoes']['Row']

// Agendamento com joins
export type AgendamentoFull = AgendamentoRow & {
  cliente:      ClienteRow
  servico:      ServicoRow
  executor:     UserRow
  recepcionista: UserRow | null
}
