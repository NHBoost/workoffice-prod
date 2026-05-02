/**
 * Barrel d'exports pour la lib UI premium WorkOffice.
 *
 * Usage :
 *   import { Button, Badge, Card, Input, EmptyState } from '@/components/ui'
 */

export { Button } from './Button'
export type { ButtonProps } from './Button'

export { Badge, StatusBadge, RoleBadge } from './Badge'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card'

export {
  Field,
  Input,
  Textarea,
  Select,
  Checkbox,
  Toggle,
} from './Input'
export type { InputProps, TextareaProps, SelectProps } from './Input'

export { Skeleton, StatCardSkeleton, TableSkeleton } from './Skeleton'

export { Spinner, PageSpinner } from './Spinner'

export { Avatar, AvatarStack } from './Avatar'

export { EmptyState } from './EmptyState'

export { PageHeader } from './PageHeader'
