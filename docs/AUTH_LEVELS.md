# Convención de niveles de permiso

ZytekOS usa convención Unix-style: nivel bajo = más permisos.

| Nivel | Rol           | Rango                         |
|-------|---------------|-------------------------------|
| 1     | Super Admin   | Todo                          |
| 2     | Gerente       | Admin ERP + operación         |
| 3     | Supervisor    | Autoriza acciones sensibles   |
| 4     | Cajero        | Caja + salón                  |
| 5     | Mesero        | Solo salón                    |
| 6     | Cocina        | Redirige a KDS                |

## Regla de validación

Una acción con minNivel = N requiere `currentUser.nivel <= N`.
Ejemplo: `corteX` tiene minNivel = 4, aprueba nivel 1, 2, 3, 4.

## Mapa AUTH_NIVEL_MIN actual

| Acción         | minNivel | Roles que pasan                    |
|----------------|----------|------------------------------------|
| abrirMesa      | 5        | Todos (1-5)                        |
| enviarCocina   | 5        | Todos (1-5)                        |
| cobrar         | 4        | Cajero, Supervisor, Gerente, Admin |
| corteX         | 4        | Cajero, Supervisor, Gerente, Admin |
| registrarAbono | 4        | Cajero, Supervisor, Gerente, Admin |
| anularPlato    | 3        | Supervisor, Gerente, Admin         |
| anularOrden    | 3        | Supervisor, Gerente, Admin         |
| descuento      | 3        | Supervisor, Gerente, Admin         |
| corteZ         | 3        | Supervisor, Gerente, Admin         |
| actualizarTasa | 3        | Supervisor, Gerente, Admin         |
| abrirCredito   | 3        | Supervisor, Gerente, Admin         |

## Nota sobre el futuro

Esta convención será reemplazada por permisos granulares JSON
(ver `pos_roles_config.permissions`). El nivel numérico quedará
como atributo informativo jerárquico, pero las decisiones de acceso
las hará `user_can(user_id, permission)`.
