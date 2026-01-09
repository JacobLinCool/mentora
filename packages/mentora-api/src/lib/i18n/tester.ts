/**
 * Translations for API Tester page
 * Simple inline i18n solution for mentora-api package
 */

export type Language = 'en' | 'zh-TW';

export const testerTranslations = {
	en: {
		title: 'API Tester',
		subtitle: 'Test API endpoints with live requests',
		authHint: 'Logged in, token will be auto-included',
		authWarning: 'Please login to test authenticated APIs',
		authStatus: 'Auth Status',
		notLoggedIn: 'Not logged in - Use Google Sign In above',
		baseUrl: 'Base URL',
		selectEndpoint: 'Select an endpoint',
		selectEndpointDesc: 'Choose an API endpoint from the sidebar to start testing',
		pathParams: 'Path Parameters',
		queryParams: 'Query Parameters',
		requestBody: 'Request Body',
		response: 'Response',
		send: 'Send',
		sending: 'Sending...',
		presets: 'Presets',
		clickToRequest: 'Click "Send" to make a request',
		required: 'Required'
	},
	'zh-TW': {
		title: 'API 測試工具',
		subtitle: '使用即時請求測試 API 端點',
		authHint: '已登入，Token 會自動帶入',
		authWarning: '請先登入以測試需要認證的 API',
		authStatus: '認證狀態',
		notLoggedIn: '未登入 - 請使用上方 Google 登入',
		baseUrl: '基礎 URL',
		selectEndpoint: '選擇端點',
		selectEndpointDesc: '從側邊欄選擇 API 端點以開始測試',
		pathParams: '路徑參數',
		queryParams: '查詢參數',
		requestBody: '請求主體',
		response: '回應',
		send: '發送',
		sending: '發送中...',
		presets: '預設值',
		clickToRequest: '點擊「發送」以發出請求',
		required: '必填'
	}
} as const;

export function getTranslation(lang: Language) {
	return testerTranslations[lang];
}
