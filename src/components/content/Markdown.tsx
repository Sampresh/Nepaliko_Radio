import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { marked } from 'marked';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/Text';
import { Colors, FontFamily, FontSize, Radius, Spacing } from '@/theme';
import type { ContentLanguage } from '@/types/firestore';

/**
 * Loose view of marked's token union. The library's discriminated union is
 * awkward to narrow across every node type, and we only read a handful of
 * fields, so a structural shape keeps this readable without `any`.
 */
interface MdToken {
  type: string;
  raw?: string;
  text?: string;
  depth?: number;
  ordered?: boolean;
  start?: number | '';
  href?: string;
  lang?: string;
  items?: MdToken[];
  tokens?: MdToken[];
}

function openLink(href?: string) {
  if (!href) return;
  // Only http(s) — never let post content trigger arbitrary schemes.
  if (!/^https?:\/\//i.test(href)) return;
  WebBrowser.openBrowserAsync(href).catch(() => {});
}

function renderInline(tokens: MdToken[] | undefined, keyPrefix: string): React.ReactNode {
  if (!tokens?.length) return null;

  return tokens.map((token, index) => {
    const key = `${keyPrefix}.${index}`;

    switch (token.type) {
      case 'strong':
        return (
          <Text key={key} style={styles.strong}>
            {token.tokens ? renderInline(token.tokens, key) : token.text}
          </Text>
        );
      case 'em':
        return (
          <Text key={key} style={styles.em}>
            {token.tokens ? renderInline(token.tokens, key) : token.text}
          </Text>
        );
      case 'del':
        return (
          <Text key={key} style={styles.del}>
            {token.tokens ? renderInline(token.tokens, key) : token.text}
          </Text>
        );
      case 'codespan':
        return (
          <Text key={key} style={styles.codespan}>
            {token.text}
          </Text>
        );
      case 'link':
        return (
          <Text key={key} style={styles.link} onPress={() => openLink(token.href)}>
            {token.tokens ? renderInline(token.tokens, key) : (token.text ?? token.href)}
          </Text>
        );
      case 'br':
        return <Text key={key}>{'\n'}</Text>;
      case 'escape':
        return <Text key={key}>{token.text}</Text>;
      default:
        if (token.tokens?.length) return <Text key={key}>{renderInline(token.tokens, key)}</Text>;
        return <Text key={key}>{token.text ?? token.raw ?? ''}</Text>;
    }
  });
}

function renderBlock(token: MdToken, key: string, lang?: ContentLanguage): React.ReactNode {
  switch (token.type) {
    case 'space':
      return null;

    case 'heading': {
      const depth = token.depth ?? 1;
      return (
        <AppText
          key={key}
          variant={depth <= 2 ? 'title' : 'body'}
          weight="bold"
          lang={lang}
          style={styles.heading}>
          {renderInline(token.tokens, key) ?? token.text}
        </AppText>
      );
    }

    case 'paragraph': {
      // A lone image renders as a block rather than inline text.
      const only = token.tokens?.length === 1 ? token.tokens[0] : null;
      if (only?.type === 'image' && only.href) {
        return (
          <Image
            key={key}
            source={{ uri: only.href }}
            style={styles.image}
            contentFit="cover"
            transition={200}
            accessibilityLabel={only.text}
          />
        );
      }
      return (
        <AppText key={key} lang={lang} style={styles.paragraph}>
          {renderInline(token.tokens, key)}
        </AppText>
      );
    }

    case 'list': {
      const ordered = token.ordered ?? false;
      const start = typeof token.start === 'number' ? token.start : 1;
      return (
        <View key={key} style={styles.list}>
          {token.items?.map((item, index) => (
            <View key={`${key}.${index}`} style={styles.listItem}>
              <AppText color={Colors.textSecondary} style={styles.bullet}>
                {ordered ? `${start + index}.` : '•'}
              </AppText>
              <AppText lang={lang} style={styles.listItemText}>
                {renderInline(item.tokens, `${key}.${index}`)}
              </AppText>
            </View>
          ))}
        </View>
      );
    }

    case 'blockquote':
      return (
        <View key={key} style={styles.blockquote}>
          {token.tokens?.map((child, index) => renderBlock(child, `${key}.${index}`, lang))}
        </View>
      );

    case 'code':
      return (
        <View key={key} style={styles.codeBlock}>
          <Text style={styles.codeText}>{token.text}</Text>
        </View>
      );

    case 'hr':
      return <View key={key} style={styles.hr} />;

    default:
      if (token.tokens?.length) {
        return (
          <AppText key={key} lang={lang} style={styles.paragraph}>
            {renderInline(token.tokens, key)}
          </AppText>
        );
      }
      return null;
  }
}

export function Markdown({ content, lang }: { content: string; lang?: ContentLanguage }) {
  const tokens = useMemo(() => {
    try {
      return marked.lexer(content) as unknown as MdToken[];
    } catch {
      return [];
    }
  }, [content]);

  if (!tokens.length) {
    return <AppText lang={lang}>{content}</AppText>;
  }

  return <View style={styles.root}>{tokens.map((t, i) => renderBlock(t, `b${i}`, lang))}</View>;
}

const styles = StyleSheet.create({
  root: {
    gap: Spacing.md,
  },
  heading: {
    marginTop: Spacing.sm,
  },
  paragraph: {
    color: Colors.textPrimary,
  },
  strong: {
    fontFamily: FontFamily.bold,
  },
  em: {
    fontStyle: 'italic',
  },
  del: {
    textDecorationLine: 'line-through',
  },
  link: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  codespan: {
    fontFamily: 'Courier',
    fontSize: FontSize.small,
    color: Colors.primary,
  },
  codeBlock: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.card,
    padding: Spacing.lg,
  },
  codeText: {
    fontFamily: 'Courier',
    fontSize: FontSize.small,
    color: Colors.textPrimary,
  },
  list: {
    gap: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  bullet: {
    minWidth: 18,
  },
  listItemText: {
    flex: 1,
  },
  blockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: Spacing.lg,
    gap: Spacing.sm,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: Radius.card,
  },
  hr: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginVertical: Spacing.sm,
  },
});
