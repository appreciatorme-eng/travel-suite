import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gobuddy_mobile/core/theme/app_theme.dart';

void main() {
  test('lightTheme is configured with expected design tokens', () {
    final theme = AppTheme.lightTheme;

    expect(theme.useMaterial3, isTrue);
    expect(theme.brightness, Brightness.light);
    expect(theme.colorScheme.primary, AppTheme.primary);
    expect(theme.colorScheme.secondary, AppTheme.secondary);
    expect(theme.scaffoldBackgroundColor, AppTheme.background);

    expect(theme.appBarTheme.centerTitle, isTrue);
    expect(theme.appBarTheme.foregroundColor, AppTheme.textPrimary);

    final cardShape = theme.cardTheme.shape as RoundedRectangleBorder;
    expect(cardShape.borderRadius, BorderRadius.circular(16));

    final elevatedStyle = theme.elevatedButtonTheme.style;
    expect(
      elevatedStyle?.backgroundColor?.resolve(<WidgetState>{}),
      AppTheme.primary,
    );

    final outlinedStyle = theme.outlinedButtonTheme.style;
    final outlinedSide = outlinedStyle?.side?.resolve(<WidgetState>{});
    expect(outlinedSide?.color, AppTheme.primary);

    expect(theme.textTheme.displayMedium?.fontFamily, 'CormorantGaramond');
    expect(theme.textTheme.titleLarge?.fontFamily, 'Poppins');
    expect(theme.textTheme.bodyMedium?.color, AppTheme.textSecondary);
  });

  test('gradients expose expected color stops', () {
    expect(AppTheme.primaryGradient.colors.first, AppTheme.primary);
    expect(AppTheme.backgroundGradient.colors.length, 3);
    expect(AppTheme.backgroundGradient.colors[1], const Color(0xFFF8FAFC));
  });
}
