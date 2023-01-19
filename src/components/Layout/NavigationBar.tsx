import React, { useCallback, useState } from 'react'
import { useRouter } from 'next/router'
import styled from 'styled-components'
import {
  Collapse,
  Nav as NavBase,
  Navbar as NavbarBase,
  NavbarBrand as NavbarBrandBase,
  NavbarToggler as NavbarTogglerBase,
  NavItem as NavItemBase,
} from 'reactstrap'

import LogoPangenomeBase from 'src/assets/img/pangenome.svg'

import { Link } from 'src/components/Link/Link'

const navLinksLeft: Record<string, string> = {
  '/': 'Home',
  '/about': 'About',
}

export const Navbar = styled(NavbarBase)`
  position: sticky;
  height: 40px;
  top: 0;
  width: 100%;
  padding: 6px 10px;
  box-shadow: ${(props) => props.theme.shadows.medium};
  margin-bottom: 1rem;
  z-index: 100;
  background-color: ${(props) => props.theme.white};
  opacity: 1;
`

export const Nav = styled(NavBase)``

export const NavItem = styled(NavItemBase)`
  padding: 0 1rem;
  flex-grow: 0;
  flex-shrink: 0;
`

export const NavLink = styled(Link)<{ $active: boolean }>`
  color: ${({ $active, theme }) => ($active ? theme.primary : theme.bodyColor)};
  font-weight: ${({ $active }) => $active && 'bold'};
  text-decoration: ${({ $active }) => $active && 'underline'};
`

export const NavbarToggler = styled(NavbarTogglerBase)`
  border: none;
`

const NavbarBrand = styled(NavbarBrandBase)`
  padding: 0;
`

export const BrandText = styled.span`
  color: ${({ theme }) => theme.bodyColor};
  font-size: 1.25rem;
  font-weight: bold;
  margin: auto;
  padding-right: 5px;
  text-align: center;
  vertical-align: middle;
`

const LogoPangenome = styled(LogoPangenomeBase)`
  width: 44px;
  height: 44px;
  margin: 0 1rem;
`

export function NavigationBar() {
  const { pathname } = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const toggle = useCallback(() => setIsOpen(!isOpen), [isOpen])

  return (
    <Navbar expand="md" light role="navigation">
      <Nav>
        <NavbarBrand tag={Link} href="/">
          <LogoPangenome />
          <BrandText>{'Pangenome'}</BrandText>
        </NavbarBrand>

        <NavbarToggler onClick={toggle} />

        <Collapse isOpen={isOpen} navbar>
          {Object.entries(navLinksLeft).map(([url, text]) => {
            return (
              <NavItem key={url}>
                <NavLink href={url} $active={url === pathname}>
                  {text}
                </NavLink>
              </NavItem>
            )
          })}
        </Collapse>
      </Nav>
    </Navbar>
  )
}
