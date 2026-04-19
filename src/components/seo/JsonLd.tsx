type JsonLdProps = {
  data: Record<string, unknown> | Array<Record<string, unknown>>;
  nonce?: string;
};

export function JsonLd({ data, nonce }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      nonce={nonce}
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}
