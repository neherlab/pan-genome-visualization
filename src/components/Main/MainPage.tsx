import React from 'react'
import { Col, Row } from 'reactstrap'

import { Layout } from 'src/components/Layout/Layout'
import MainPageContent from 'src/components/Main/MainPage.mdx'
import { SpeciesTable } from 'src/components/Main/SpeciesTable'

export function MainPage() {
  return (
    <Layout>
      <MainPageContent />

      <Row noGutters>
        <Col>
          <SpeciesTable />
        </Col>
      </Row>
    </Layout>
  )
}
