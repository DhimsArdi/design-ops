// Small, muted "(optional)" / "*" markers for FieldLabel text, so a form with
// a mix of required and optional fields says which is which instead of making
// someone guess or find out by submitting (feedback from Onboarding's Team
// profile section reading as unclear about what actually blocks Continue).

function Required() {
  return (
    <span aria-hidden className="text-destructive">
      *
    </span>
  )
}

function Optional() {
  return <span className="font-normal text-muted-foreground">(optional)</span>
}

export { Required, Optional }
