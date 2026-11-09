import { KeyboardEvent } from 'react'
import { Alert, Button, DatePicker, Flex, Typography } from 'antd'
import dayjs from 'dayjs'
import { Controller, Resolver, useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import {
  InvoiceFormValues,
  ValidInvoiceForm,
  invoiceFormSchema,
} from '../../model/invoiceForm'
import ButtonLink from '../ButtonLink'
import CustomerAutoComplete from '../CustomerAutoComplete/CustomerAutoComplete'
import FieldError from './FieldError'
import InvoiceFormTotals from './InvoiceFormTotals'
import InvoiceLinesEditor from './InvoiceLinesEditor'

const DATE_FORMAT = 'YYYY-MM-DD'

// Enter in a date field accepts the typed date (the picker does that itself);
// it must not also submit the form.
const keepEnterInField = (event: KeyboardEvent<HTMLElement>) => {
  if (event.key === 'Enter') event.preventDefault()
}

type Props = {
  title: string
  // Read once, when the form is first shown.
  defaultValues: InvoiceFormValues
  submitLabel: string
  // Where "Cancel" leads.
  cancelTo: string
  // Called with the validated values only.
  onSubmit: (values: ValidInvoiceForm) => void
  isSubmitting: boolean
  // The reason the last save failed, if it did.
  submitError?: string
}

const InvoiceForm = ({
  title,
  defaultValues,
  submitLabel,
  cancelTo,
  onSubmit,
  isSubmitting,
  submitError,
}: Props) => {
  // Nothing is validated until the first submit; after that each field is
  // validated again as it changes, and a failed submit focuses the first field
  // in error (the library's defaults).
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<InvoiceFormValues, unknown, ValidInvoiceForm>({
    defaultValues,
    // yup has one type per schema (the valid one), so the resolver is typed as
    // taking that; the schema does accept the wider form values it checks.
    resolver: yupResolver(invoiceFormSchema) as Resolver<
      InvoiceFormValues,
      unknown,
      ValidInvoiceForm
    >,
  })

  // The guard covers the Enter key in a field, which submits the form without
  // going through the (disabled) button.
  const submit = handleSubmit((values) => {
    if (!isSubmitting) onSubmit(values)
  })

  return (
    <form onSubmit={(event) => void submit(event)}>
      <Flex vertical gap="large">
        <Flex justify="space-between" align="center" gap="1rem" wrap>
          <Typography.Title level={1} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          <Flex>
            <ButtonLink type="link" to={cancelTo}>
              Cancel
            </ButtonLink>
            <Button type="primary" htmlType="submit" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </Flex>
        </Flex>

        {submitError && (
          <Alert
            type="error"
            showIcon
            title="The invoice could not be saved"
            description={submitError}
          />
        )}

        <Flex gap="medium" wrap>
          <Flex vertical gap="small">
            <label htmlFor="customer">Customer</label>
            <Controller
              control={control}
              name="customer"
              render={({ field, fieldState }) => (
                <CustomerAutoComplete
                  id="customer"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    errors.customer ? 'customer-error' : undefined
                  }
                  status={errors.customer ? 'error' : undefined}
                  value={field.value}
                  onChange={field.onChange}
                  ref={field.ref}
                />
              )}
            />
            <FieldError
              id="customer-error"
              message={errors.customer?.message}
            />
          </Flex>

          <Flex vertical gap="small">
            <label htmlFor="date">Date</label>
            <Controller
              control={control}
              name="date"
              render={({ field, fieldState }) => (
                <DatePicker
                  id="date"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={errors.date ? 'date-error' : undefined}
                  status={errors.date ? 'error' : undefined}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(day) =>
                    field.onChange(day ? day.format(DATE_FORMAT) : null)
                  }
                  onKeyDown={keepEnterInField}
                  ref={field.ref}
                />
              )}
            />
            <FieldError id="date-error" message={errors.date?.message} />
          </Flex>

          <Flex vertical gap="small">
            <label htmlFor="deadline">Deadline</label>
            <Controller
              control={control}
              name="deadline"
              render={({ field, fieldState }) => (
                <DatePicker
                  id="deadline"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={
                    errors.deadline ? 'deadline-error' : undefined
                  }
                  status={errors.deadline ? 'error' : undefined}
                  value={field.value ? dayjs(field.value) : null}
                  onChange={(day) =>
                    field.onChange(day ? day.format(DATE_FORMAT) : null)
                  }
                  onKeyDown={keepEnterInField}
                  ref={field.ref}
                />
              )}
            />
            <FieldError
              id="deadline-error"
              message={errors.deadline?.message}
            />
          </Flex>
        </Flex>

        <InvoiceLinesEditor control={control} />

        <InvoiceFormTotals control={control} />
      </Flex>
    </form>
  )
}

export default InvoiceForm
