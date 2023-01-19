import styled from 'styled-components'

import { LinkExternal } from 'src/components/Link/LinkExternal'

export const LogoLink = styled(LinkExternal)`
  padding: 10px 20px;

  svg {
    height: 20px;
  }

  @media (max-width: 768px) {
    padding: 5px 4px;
    flex-grow: 1;

    svg {
      height: 20px;
    }
  }

  @media (max-width: 576px) {
    padding: 5px 5px;
    flex-grow: 1;

    svg {
      height: 20px;
    }
  }
`
