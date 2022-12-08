<template>
    <div class="hairstyles">
        <!-- Hair Style -->
        <div class="header-info overline boldest white--text mb-2">{{ locale.STYLE }}</div>
        <div class="split split-full-width">
            <Button class="eye-btn" color="blue" @click="$emit('decrement-index', 'hairIndex', getHairStylesLength())">
                <Icon icon="icon-chevron-left" :size="24" />
            </Button>
            <div class="text-sm-overline white--text mb-2 header-bold">
                {{ getHairNames()[currentIndex] }}
            </div>
            <Button class="eye-btn" color="blue" @click="$emit('increment-index', 'hairIndex', getHairStylesLength())">
                <Icon icon="icon-chevron-right" :size="24" />
            </Button>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, defineAsyncComponent } from 'vue';
import { BARBER_SHOP_LOCALE } from '../../shared/locales';
import { hairStyles as allHairStyles } from '@AthenaShared/information/hairStyles';
import { HairStyle } from '@AthenaShared/interfaces/hairStyles';

const ComponentName = 'HairstyleComponent';
export default defineComponent({
    name: ComponentName,
    components: {
        Icon: defineAsyncComponent(() => import('@components/Icon.vue')),
        Button: defineAsyncComponent(() => import('@components/Button.vue')),
    },
    props: {
        currentIndex: {
            type: Number,
            default: 0,
        },
        sex: {
            type: Number,
            default: 0,
        },
    },
    data() {
        return {
            hairStyles: [],
            locale: BARBER_SHOP_LOCALE,
        };
    },
    methods: {
        getNonGreylistedHair(styles: HairStyle[]): HairStyle[] {
            return styles.filter((style: HairStyle) => style.greylist === false);
        },
        getHairStylesLength() {
            return this.hairStyles.length - 1;
        },
        getHairNames(): string[] {
            return this.hairStyles.map((style: HairStyle) => style.name);
        },
    },
    mounted() {
        if (this.sex === 0) {
            this.hairStyles = this.getNonGreylistedHair(allHairStyles.female);
        } else {
            this.hairStyles = this.getNonGreylistedHair(allHairStyles.male);
        }
    },
});
</script>

<style>
.hairstyles {
    display: flex;
    flex-direction: column;
    flex-wrap: wrap;
    height: auto;
    width: 100%;
    box-sizing: border-box;
}

.split {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
}

.eye-btn {
    min-width: 54px;
    max-width: 54px;
    border-radius: 12px;
    transform: scale(0.75);
}

.header-info {
    text-shadow: 1px 2px 3px black;
    padding: 6px;
    background: rgba(0, 0, 0, 0.9);
    border-radius: 6px;
    padding-left: 12px;
}

.header-bold {
    display: flex;
    text-shadow: 1px 2px 3px black;
    height: 100%;
    justify-content: center;
    align-items: center;
    word-wrap: break-word;
    max-width: 110px;
    text-align: center;
    word-break: keep-all;
}
</style>
