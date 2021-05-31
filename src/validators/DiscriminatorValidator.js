
const Validator = require('./Validator'),
    validatorUtils = require('./validator-utils');

class DiscriminatorValidator extends Validator {
    constructor(schema) {
        super(discriminator, schema);
    }
}

function findSchemaValidation(tree, data) {
    const currentValue = tree.getValue();
    if (currentValue.discriminator){
        const discriminatorValue = data[currentValue.discriminator];
        if (!tree.getValue().allowedValues.includes(discriminatorValue)){
            validatorUtils.allowedValuesError.call(this, currentValue.discriminator, currentValue.allowedValues);
            return;
        }
        if (tree.getValue().validators[discriminatorValue]){
            return tree.getValue().validators[discriminatorValue];
        }
        const newNode = tree.childrenAsKeyValue[discriminatorValue];
        return findSchemaValidation.call(this, newNode, data);
    }
    throw new Error('DEBUG: there is no discriminator on current value');
}

function discriminator(schemas, data) {
    const currentValue = schemas.getValue();
    const subDiscriminator = currentValue.discriminator && currentValue.discriminator.startsWith('.');
    if (!subDiscriminator) {
        const schema = findSchemaValidation.call(this, schemas, data);
        let result = false;
        if (schema) {
            result = schema(data);
            this.errors = schema.errors;
        }
        return result;
    }

    const validator = currentValue.validator;
    let result = validator(data);
    this.errors = validator.errors;
    if (!result) return result;

    const key = currentValue.discriminator.replace('.', '');
    schemas = Object.values(schemas.childrenAsKeyValue)[0];
    data = data[key];

    const errors = [];
    data.forEach((subData, index) => {
        const schema = findSchemaValidation.call(this, schemas, subData);
        if (schema) {
            result = result && schema(subData);
            errors.push(addErrorPrefix(schema.errors, key + `[${index}]`));
        }
    });

    this.errors = errors.length ? errors : null;
    return result;
}

function addErrorPrefix(errors, prefix) {
    errors.forEach(error => {
        error.dataPath = '.' + prefix + error.dataPath;
        error.schemaPath = error.schemaPath.replace('#', '#/' + prefix);
    });
    return errors;
}

module.exports = DiscriminatorValidator;
