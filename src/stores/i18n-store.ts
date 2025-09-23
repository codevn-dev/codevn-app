'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Locale = 'en' | 'vi';

type Dictionary = Record<string, { en: string; vi: string }>;

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const store: Dictionary = {
  // Navigation
  'nav.articles': { en: 'Articles', vi: 'Bài viết' },
  'nav.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'nav.editProfile': { en: 'Edit Profile', vi: 'Chỉnh sửa hồ sơ' },
  'nav.signOut': { en: 'Sign Out', vi: 'Đăng xuất' },
  'nav.signIn': { en: 'Sign In', vi: 'Đăng nhập' },
  'nav.signUp': { en: 'Sign Up', vi: 'Đăng ký' },

  // Chat
  'chat.title': { en: 'Chat', vi: 'Trò chuyện' },
  'chat.online': { en: 'Online', vi: 'Trực tuyến' },
  'chat.offline': { en: 'Offline', vi: 'Ngoại tuyến' },
  'chat.loadingMessages': { en: 'Loading messages...', vi: 'Đang tải tin nhắn...' },
  'chat.loadMore': { en: 'Load More Messages', vi: 'Tải thêm tin nhắn' },
  'chat.loading': { en: 'Loading...', vi: 'Đang tải...' },
  'chat.typeMessage': { en: 'Type a message...', vi: 'Nhập tin nhắn...' },
  'chat.findConversation': { en: 'Find a conversation...', vi: 'Tìm cuộc trò chuyện...' },
  'chat.noConversation': { en: 'No conversation found', vi: 'Không có cuộc trò chuyện' },
  'chat.send': { en: 'Send', vi: 'Gửi' },
  'chat.sendMessage': { en: 'Send Message', vi: 'Gửi tin nhắn' },

  // Articles
  'articles.my': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'articles.latest': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'articles.all': { en: 'All Articles', vi: 'Tất cả bài viết' },
  'articles.total': { en: 'Articles', vi: 'Bài viết' },
  'articles.allCategories': { en: 'All Categories', vi: 'Tất cả danh mục' },
  'articles.manageIntro': {
    en: 'Manage your articles and share your knowledge',
    vi: 'Quản lý bài viết và chia sẻ kiến thức của bạn',
  },
  'articles.new': { en: 'New Article', vi: 'Bài viết mới' },
  'articles.searchPlaceholder': {
    en: 'Search your articles...',
    vi: 'Tìm bài viết của bạn...',
  },
  'articles.sort.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.sort.created': { en: 'Created', vi: 'Ngày tạo' },
  'articles.sort.updated': { en: 'Updated', vi: 'Ngày cập nhật' },
  'articles.published': { en: 'Published', vi: 'Đã xuất bản' },
  'articles.draft': { en: 'Draft', vi: 'Bản nháp' },
  'articles.menu.publish': { en: 'Publish', vi: 'Xuất bản' },
  'articles.menu.unpublish': { en: 'Unpublish', vi: 'Gỡ xuất bản' },
  'articles.menu.preview': { en: 'Preview', vi: 'Xem thử' },
  'articles.menu.view': { en: 'View', vi: 'Xem' },
  'articles.menu.edit': { en: 'Edit', vi: 'Sửa' },
  'articles.menu.delete': { en: 'Delete', vi: 'Xoá' },
  'articles.form.createNew': { en: 'Create New Article', vi: 'Tạo bài viết mới' },
  'articles.form.title': { en: 'Title', vi: 'Tiêu đề' },
  'articles.form.slug': { en: 'Slug', vi: 'Slug' },
  'articles.form.titlePlaceholder': { en: 'Enter article title', vi: 'Nhập tiêu đề bài viết' },
  'articles.form.slugPlaceholder': { en: 'article-slug', vi: 'bai-viet-slug' },
  'articles.form.thumbnail': { en: 'Thumbnail', vi: 'Ảnh đại diện' },
  'articles.form.clickToUpload': {
    en: 'Click to upload thumbnail',
    vi: 'Nhấn để tải ảnh đại diện',
  },
  'articles.form.thumbHint': {
    en: 'PNG, JPG, GIF, WebP up to 5MB',
    vi: 'PNG, JPG, GIF, WebP tối đa 5MB',
  },
  'articles.form.category': { en: 'Category', vi: 'Danh mục' },
  'articles.form.selectCategory': { en: 'Select a category', vi: 'Chọn danh mục' },
  'articles.form.content': { en: 'Content', vi: 'Nội dung' },
  'articles.form.publishNow': { en: 'Publish immediately', vi: 'Xuất bản ngay' },
  'articles.form.cancel': { en: 'Cancel', vi: 'Huỷ' },
  'articles.form.create': { en: 'Create', vi: 'Tạo' },

  // Profile
  'profile.notFound': { en: 'Profile not found', vi: 'Không tìm thấy hồ sơ' },
  'profile.yourProfile': { en: 'Your Profile', vi: 'Hồ sơ của bạn' },
  'profile.userProfile': { en: 'User Profile', vi: 'Hồ sơ người dùng' },
  'profile.settings': { en: 'Profile Settings', vi: 'Cài đặt hồ sơ' },
  'profile.manageIntro': {
    en: 'Manage your account information and preferences',
    vi: 'Quản lý thông tin tài khoản và tuỳ chọn của bạn',
  },
  'profile.fullName': { en: 'Full Name', vi: 'Họ và tên' },
  'profile.emailAddress': { en: 'Email Address', vi: 'Địa chỉ Email' },
  'profile.fullNamePlaceholder': { en: 'Enter your full name', vi: 'Nhập họ và tên của bạn' },
  'profile.updated': { en: 'Profile updated successfully', vi: 'Cập nhật hồ sơ thành công' },
  'profile.totalArticles': { en: 'Total Articles', vi: 'Tổng số bài viết' },
  'profile.totalComments': { en: 'Total Comments', vi: 'Tổng bình luận' },
  'profile.totalLikes': { en: 'Total Likes', vi: 'Tổng lượt thích' },
  'profile.totalDislikes': { en: 'Total Dislikes', vi: 'Tổng lượt không thích' },
  'profile.accessLevel': { en: 'Access level', vi: 'Quyền truy cập' },
  'profile.memberSince': { en: 'Member since', vi: 'Thời gian gia nhập' },
  'profile.save': { en: 'Save', vi: 'Lưu' },
  'profile.saving': { en: 'Saving', vi: 'Đang lưu' },
  'profile.cancel': { en: 'Cancel', vi: 'Huỷ' },
  'profile.upload': { en: 'Upload', vi: 'Tải lên' },

  // Common
  'common.back': { en: 'Back', vi: 'Quay lại' },

  // Admin
  'admin.accessDenied': {
    en: 'Access denied. Admin privileges required.',
    vi: 'Truy cập bị từ chối. Cần quyền quản trị.',
  },
  'admin.panel': { en: 'Admin Panel', vi: 'Trang quản trị' },
  'admin.users': { en: 'Users', vi: 'Người dùng' },
  'admin.userManagement': { en: 'User Management', vi: 'Quản lý người dùng' },
  'admin.showing': { en: 'Showing:', vi: 'Hiển thị:' },
  'admin.usersAbbrev': { en: 'user(s)', vi: 'người dùng' },
  'admin.onPage': { en: 'on page', vi: 'ở trang' },
  'admin.of': { en: 'of', vi: 'trên' },
  'admin.totalSuffix': { en: 'total', vi: 'tổng' },
  'admin.sort.name': { en: 'Name', vi: 'Tên' },
  'admin.sort.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.searchPlaceholder': {
    en: 'Search by name or email...',
    vi: 'Tìm theo tên hoặc email...',
  },
  'admin.table.user': { en: 'User', vi: 'Người dùng' },
  'admin.table.role': { en: 'Role', vi: 'Vai trò' },
  'admin.table.joined': { en: 'Joined', vi: 'Ngày tham gia' },
  'admin.role.user': { en: 'User', vi: 'Người dùng' },
  'admin.role.admin': { en: 'Admin', vi: 'Quản trị viên' },
  'admin.page': { en: 'Page', vi: 'Trang' },
  'admin.usersPerPage': { en: 'users per page', vi: 'người dùng mỗi trang' },
  'admin.previous': { en: 'Previous', vi: 'Trước' },
  'admin.next': { en: 'Next', vi: 'Sau' },
  'admin.categories': { en: 'Categories', vi: 'Danh mục' },
  'admin.categoriesManagement': { en: 'Categories Management', vi: 'Quản lý danh mục' },
  'admin.newCategory': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.rootCategory': { en: 'Root Category', vi: 'Danh mục gốc' },
  'admin.subCategories': { en: 'Sub categories', vi: 'Danh mục con' },
  'admin.createdBy': { en: 'Created by', vi: 'Tạo bởi' },
  'admin.edit': { en: 'Edit', vi: 'Sửa' },
  'admin.delete': { en: 'Delete', vi: 'Xoá' },

  // Homepage
  'home.searchPlaceholder': {
    en: 'Search articles, author or email...',
    vi: 'Tìm bài viết, tác giả hoặc email...',
  },
  'home.myArticles': { en: 'My Articles', vi: 'Bài viết của tôi' },
  'home.clearFilters': { en: 'Clear Filters', vi: 'Xoá bộ lọc' },
  'home.latestArticles': { en: 'Latest Articles', vi: 'Bài viết mới nhất' },
  'home.tagline': {
    en: 'Fresh insights from the Vietnamese developer community',
    vi: 'Góc nhìn mới từ cộng đồng lập trình viên Việt Nam',
  },
  'home.noMore': { en: 'No more articles to show', vi: 'Không còn bài viết để hiển thị' },

  // Common footer
  'common.copyrightSuffix': { en: 'All rights reserved.', vi: 'Đã đăng ký bản quyền.' },
  'common.cancel': { en: 'Cancel', vi: 'Huỷ' },
  'common.create': { en: 'Create', vi: 'Tạo' },
  'common.update': { en: 'Update', vi: 'Cập nhật' },

  // Comments/Article Content
  'comments.back': { en: 'Back', vi: 'Quay lại' },
  'comments.showReplies': { en: 'Show replies', vi: 'Hiện trả lời' },
  'comments.writeReply': { en: 'Write a reply...', vi: 'Viết trả lời...' },
  'comments.writeComment': { en: 'Write a comment...', vi: 'Viết bình luận...' },
  'comments.characters': { en: 'characters', vi: 'kí tự' },
  'comments.reply': { en: 'Reply', vi: 'Trả lời' },
  'comments.comment': { en: 'Comment', vi: 'Bình luận' },
  'comments.loadMoreComments': { en: 'Load more comments', vi: 'Tải thêm bình luận' },
  'comments.loadMoreReplies': { en: 'Load more replies', vi: 'Tải thêm trả lời' },

  // Admin - Categories modal
  'admin.category.new': { en: 'New Category', vi: 'Danh mục mới' },
  'admin.category.name': { en: 'Name', vi: 'Tên' },
  'admin.category.namePlaceholder': { en: 'Enter category name', vi: 'Nhập tên danh mục' },
  'admin.category.description': { en: 'Description', vi: 'Mô tả' },
  'admin.category.descriptionPlaceholder': {
    en: 'Enter category description',
    vi: 'Nhập mô tả danh mục',
  },
  'admin.category.color': { en: 'Color', vi: 'Màu' },
  'admin.parentCategory': { en: 'Parent Category', vi: 'Danh mục cha' },
  'admin.category.noParentRoot': { en: 'No parent (Root Category)', vi: 'Không có (Danh mục gốc)' },
};

export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      locale: 'vi',
      setLocale: (locale) => set({ locale }),
      t: (key) => {
        const { locale } = get();
        const entry = store[key];
        return entry ? (entry[locale] ?? key) : key;
      },
    }),
    {
      name: 'i18n-storage',
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
