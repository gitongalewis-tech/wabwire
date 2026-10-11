import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export default function PasswordField({ label, ...inputProps }) {
  const [visible, setVisible] = useState(false)

  return (
    <label className="password-field">
      {label}
      <span className="password-field__control">
        <input {...inputProps} type={visible ? 'text' : 'password'} />
        <button
          type="button"
          className="password-field__toggle"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          onClick={() => setVisible(value => !value)}
        >
          {visible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </span>
    </label>
  )
}
