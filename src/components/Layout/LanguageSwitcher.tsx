import React, { useCallback, useState } from 'react'
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem, DropdownProps } from 'reactstrap'
import { useRecoilState } from 'recoil'
import styled from 'styled-components'

import { localeAtom } from 'src/state/locale.state'
import { Locale, localesArray } from 'src/i18n/i18n'

const LanguageSwitcherDropdown = styled(Dropdown)`
  margin-top: 3px;

  a.nav-link {
    color: ${(props) => props.theme.bodyColor};
  }

  .language-switcher-menu.dropdown-menu {
    background-color: $body-bg;
    box-shadow: 1px 1px 2px 2px rgba($gray-600, 0.25);
  }

  .language-switcher-flag {
    width: 20px;
    height: 20px;
    margin-bottom: 5px;
    background-size: cover;
    border-radius: 2px;
    box-shadow: 1px 1px 2px 2px rgba($gray-600, 0.25);
  }
`

export type LanguageSwitcherProps = DropdownProps

export function LanguageSwitcher({ ...restProps }: LanguageSwitcherProps) {
  const [currentLocale, setCurrentLocale] = useRecoilState(localeAtom)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const toggle = useCallback(() => setDropdownOpen((prevState) => !prevState), [])
  const setLocaleLocal = useCallback((locale: Locale) => () => setCurrentLocale(locale), [setCurrentLocale])

  return (
    <LanguageSwitcherDropdown isOpen={dropdownOpen} toggle={toggle} {...restProps}>
      <DropdownToggle nav caret>
        <LanguageSwitcherItem locale={currentLocale} />
      </DropdownToggle>
      <DropdownMenu className="language-switcher-menu" positionFixed>
        {localesArray.map((locale) => {
          const isCurrent = locale.key === currentLocale.key
          return (
            <DropdownItem active={isCurrent} key={locale.key} onClick={setLocaleLocal(locale)}>
              <LanguageSwitcherItem locale={locale} />
            </DropdownItem>
          )
        })}
      </DropdownMenu>
    </LanguageSwitcherDropdown>
  )
}

export function LanguageSwitcherItem({ locale }: { locale: Locale }) {
  const { Flag, name } = locale
  return (
    <>
      <Flag className="language-switcher-flag" />
      <span className="p-2">{name}</span>
    </>
  )
}
