// Basit UBL üretimi (GİB'e gönderim yok, sadece çıktıyı görmek için)

export interface InvoiceLineInput {
  name: string;
  quantity: number;
  unitPrice: number;
  vatRate: number; // 18 => %18
  withholdingRate?: number; // 0.1 => %10 tevkifat
  discountPercent?: number;
}

export interface InvoiceUBLInput {
  invoiceNumber: string;
  issueDate: string; // YYYY-MM-DD
  scenario: 'E_FATURA' | 'E_ARSIV';
  currency: string;
  customerName: string;
  customerVknTckn: string;
  lines: InvoiceLineInput[];
}

export const buildInvoiceUBL = (input: InvoiceUBLInput): string => {
  const netLine = (l: InvoiceLineInput) => {
    const gross = l.quantity * l.unitPrice;
    const discount = l.discountPercent ? gross * (l.discountPercent / 100) : 0;
    return { gross, discount, net: gross - discount };
  };

  const total = input.lines.reduce((s, l) => s + netLine(l).net, 0);
  const vatTotal = input.lines.reduce((s, l) => s + netLine(l).net * (l.vatRate / 100), 0);
  const withholdTotal = input.lines.reduce((s, l) => s + netLine(l).net * (l.withholdingRate || 0), 0);

  const linesXml = input.lines
    .map(
      (l, idx) => `
    <cac:InvoiceLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:InvoicedQuantity>${l.quantity}</cbc:InvoicedQuantity>
      <cbc:LineExtensionAmount currencyID="${input.currency}">${netLine(l).net.toFixed(2)}</cbc:LineExtensionAmount>
      <cac:Item><cbc:Name>${escapeXml(l.name)}</cbc:Name></cac:Item>
      <cac:Price><cbc:PriceAmount currencyID="${input.currency}">${l.unitPrice.toFixed(2)}</cbc:PriceAmount></cac:Price>
      ${l.discountPercent ? `<cac:AllowanceCharge><cbc:ChargeIndicator>false</cbc:ChargeIndicator><cbc:AllowanceChargeReason>İskonto</cbc:AllowanceChargeReason><cbc:MultiplierFactorNumeric>${l.discountPercent}</cbc:MultiplierFactorNumeric></cac:AllowanceCharge>` : ''}
      <cac:TaxTotal>
        <cbc:TaxAmount currencyID="${input.currency}">${(netLine(l).net * (l.vatRate / 100)).toFixed(2)}</cbc:TaxAmount>
      </cac:TaxTotal>
    </cac:InvoiceLine>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
         xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>${input.scenario === 'E_FATURA' ? 'TEMELFATURA' : 'EARSIVFATURA'}</cbc:ProfileID>
  <cbc:ID>${input.invoiceNumber}</cbc:ID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cbc:DocumentCurrencyCode>${input.currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(input.customerName)}</cbc:Name></cac:PartyName>
      <cac:PartyIdentification><cbc:ID>${input.customerVknTckn}</cbc:ID></cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${input.currency}">${total.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${input.currency}">${total.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${input.currency}">${(total + vatTotal - withholdTotal).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${input.currency}">${(total + vatTotal - withholdTotal).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${linesXml}
</Invoice>`;
};

export interface DespatchLineInput {
  name: string;
  quantity: number;
  unit: string;
}

export interface DespatchUBLInput {
  despatchNumber: string;
  issueDate: string;
  customerName: string;
  customerVknTckn: string;
  currency: string;
  lines: DespatchLineInput[];
}

export const buildDespatchUBL = (input: DespatchUBLInput): string => {
  const linesXml = input.lines
    .map(
      (l, idx) => `
    <cac:DespatchLine>
      <cbc:ID>${idx + 1}</cbc:ID>
      <cbc:DeliveredQuantity unitCode="${escapeXml(l.unit)}">${l.quantity}</cbc:DeliveredQuantity>
      <cac:Item><cbc:Name>${escapeXml(l.name)}</cbc:Name></cac:Item>
    </cac:DespatchLine>`
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<DespatchAdvice xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
                xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ID>${input.despatchNumber}</cbc:ID>
  <cbc:IssueDate>${input.issueDate}</cbc:IssueDate>
  <cac:DespatchSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>Tedarikçi</cbc:Name></cac:PartyName>
    </cac:Party>
  </cac:DespatchSupplierParty>
  <cac:DeliveryCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${escapeXml(input.customerName)}</cbc:Name></cac:PartyName>
      <cac:PartyIdentification><cbc:ID>${input.customerVknTckn}</cbc:ID></cac:PartyIdentification>
    </cac:Party>
  </cac:DeliveryCustomerParty>
  ${linesXml}
</DespatchAdvice>`;
};

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

