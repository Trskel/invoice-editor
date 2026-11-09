import { Button, ButtonProps } from 'antd'
import { useHref, useLinkClickHandler } from 'react-router'

type ButtonLinkProps = Omit<ButtonProps, 'href' | 'onClick'> & { to: string }

// A link that looks like a button. With `href`, antd renders an <a>; the
// router's click handler navigates in the app on a plain click and leaves
// Ctrl/Cmd-click and middle-click to the browser, like <Link> does.
const ButtonLink = ({ to, ...props }: ButtonLinkProps) => {
  const href = useHref(to)
  const handleClick = useLinkClickHandler<HTMLElement>(to)
  return <Button {...props} href={href} onClick={handleClick} />
}

export default ButtonLink
